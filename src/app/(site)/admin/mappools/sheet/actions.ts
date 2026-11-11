"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { poolSuggestions, poolVotes } from "@/db/schema";
import { placeSuggestion, resolveSlot, slotPicked } from "@/db/pool-sheet";
import { poolChanged, poolState, sheetBlocked } from "@/db/pool-settle";
import { stages } from "@/db/schema";
import { slotBeatmapId } from "@/db/mappools";
import { guard } from "@/lib/admin-action";
import { log, type Viewer } from "@/lib/authz";
import { fetchMap } from "@/lib/fetch-map";
import { can } from "@/lib/roles";
import type { ActionResult } from "@/lib/action-result";
import { getPlan } from "@/db/format-plan";

async function settle(osuId: number, stageId: number, mod: string, slot: number, chosen?: number) {
  const res = await resolveSlot(stageId, mod, slot, chosen);
  if (res) await log(osuId, "pool.pick", res);
}

// poolers and testers act only on the stage whose window is open, and not while their own team is still playing; hosts always
async function inWindow(who: Viewer, stageId: number) {
  if (can(who.roles, "host")) return true;
  if (await sheetBlocked(who)) return false;
  const [st] = await db.select({ slug: stages.slug }).from(stages).where(eq(stages.id, stageId)).limit(1);
  return !!st && (await poolState()).access.open?.stage === st.slug;
}

export async function suggestMap(stageId: number, mod: string, slot: number, _: ActionResult, fd: FormData) {
  return guard("poolEdit", "pool.suggest", async ({ osuId, roles }) => {
    if (!(await inWindow({ osuId, roles }, stageId))) return { ok: false, error: "forbidden" };
    const beatmapId = await slotBeatmapId(stageId, mod, slot, fd.get("beatmap"));
    if (!beatmapId) return { ok: false, error: "invalid" };
    if (await slotPicked(stageId, mod, slot)) return { ok: false, error: "taken" };
    const [dupe] = await db
      .select({ id: poolSuggestions.id })
      .from(poolSuggestions)
      .where(and(eq(poolSuggestions.stageId, stageId), eq(poolSuggestions.mod, mod), eq(poolSuggestions.slot, slot), eq(poolSuggestions.beatmapId, beatmapId)))
      .limit(1);
    if (dupe) return { ok: false, error: "taken" };
    const [mine] = await db
      .select({ id: poolSuggestions.id })
      .from(poolSuggestions)
      .where(and(eq(poolSuggestions.stageId, stageId), eq(poolSuggestions.mod, mod), eq(poolSuggestions.slot, slot), eq(poolSuggestions.osuId, osuId)))
      .limit(1);
    if (mine) return { ok: false, error: "oneEach" };
    const data = await fetchMap(beatmapId, mod);
    if (!data) return { ok: false, error: "notFound" };
    const known = new Set((await getPlan()).subcategories.flatMap((g) => g.items.map((i) => i.id)));
    const subcategoryIds = [...new Set(fd.getAll("tags").map(String))].filter((id) => known.has(id)).slice(0, 12);
    await db.insert(poolSuggestions).values({ stageId, mod, slot, osuId, ...data, subcategoryIds });
    return { log: { stageId, mod, slot: slot + 1, beatmapId, title: data.title, version: data.version } };
  });
}

export async function voteSuggestion(id: number, score: number, note: string) {
  return guard("poolVote", "pool.vote", async ({ osuId, roles }) => {
    const text = String(note ?? "")
      .trim()
      .slice(0, 300);
    if (!Number.isInteger(score) || score < 1 || score > 10 || text.length < 2) return { ok: false, error: "invalid" };
    const [s] = await db.select().from(poolSuggestions).where(eq(poolSuggestions.id, id)).limit(1);
    if (!s) return { ok: false, error: "notFound" };
    if (!(await inWindow({ osuId, roles }, s.stageId))) return { ok: false, error: "forbidden" };
    if (s.osuId === osuId || (await slotPicked(s.stageId, s.mod, s.slot))) return { ok: false, error: "taken" };
    await db
      .insert(poolVotes)
      .values({ suggestionId: id, osuId, score, note: text })
      .onConflictDoUpdate({ target: [poolVotes.suggestionId, poolVotes.osuId], set: { score, note: text } });
    return { log: { id, score, title: s.title, version: s.version } };
  });
}

export async function removeSuggestion(id: number) {
  return guard("poolEdit", "pool.unsuggest", async ({ osuId, roles }) => {
    const [s] = await db.select().from(poolSuggestions).where(eq(poolSuggestions.id, id)).limit(1);
    if (!s) return { ok: false, error: "notFound" };
    if (s.picked || (s.osuId !== osuId && !can(roles, "host")) || !(await inWindow({ osuId, roles }, s.stageId))) return { ok: false, error: "forbidden" };
    await db.delete(poolSuggestions).where(eq(poolSuggestions.id, id));
    return { log: { id, title: s.title, version: s.version } };
  });
}

export async function pickNow(stageId: number, mod: string, slot: number) {
  return guard("host", "pool.force", async ({ osuId }) => {
    await settle(osuId, stageId, mod, slot);
    return { log: { stageId, mod, slot: slot + 1 } };
  });
}

export async function pickSuggestion(id: number) {
  return guard("host", "pool.force", async ({ osuId }) => {
    const [s] = await db.select().from(poolSuggestions).where(eq(poolSuggestions.id, id)).limit(1);
    if (!s) return { ok: false, error: "notFound" };
    await settle(osuId, s.stageId, s.mod, s.slot, id);
    return { log: { stageId: s.stageId, mod: s.mod, slot: s.slot + 1 } };
  });
}

/** the slot's elected winner goes into the stage's pool (hosts only) */
export async function pickIntoPool(stageId: number, mod: string, slot: number) {
  return guard("host", "pool.pick", async () => {
    const [s] = await db
      .select()
      .from(poolSuggestions)
      .where(and(eq(poolSuggestions.stageId, stageId), eq(poolSuggestions.mod, mod), eq(poolSuggestions.slot, slot), eq(poolSuggestions.picked, true)))
      .limit(1);
    if (!s) return { ok: false, error: "notFound" };
    if ((await placeSuggestion(s)) === "dupe") return { ok: false, error: "dupe" };
    await poolChanged(stageId);
    return { log: { stageId, mod, slot: slot + 1, title: s.title, version: s.version } };
  });
}
