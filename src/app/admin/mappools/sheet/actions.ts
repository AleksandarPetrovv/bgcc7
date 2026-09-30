"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { poolSuggestions, poolVotes } from "@/db/schema";
import { resolveSlot, slotPicked } from "@/db/pool-sheet";
import { guard } from "@/lib/admin-action";
import { getViewer, log } from "@/lib/authz";
import { MODS } from "@/lib/data";
import { fetchMap, parseBeatmapId } from "@/lib/fetch-map";
import { can, type ActionResult } from "@/lib/roles";

async function settle(osuId: number, stageId: number, mod: string, slot: number, force = false, chosen?: number) {
  const res = await resolveSlot(stageId, mod, slot, force, chosen);
  if (res) await log(osuId, "pool.pick", res);
}

export async function suggestMap(stageId: number, _: ActionResult, fd: FormData) {
  return guard("poolEdit", "pool.suggest", async (osuId) => {
    const beatmapId = parseBeatmapId(fd.get("beatmap"));
    const mod = String(fd.get("mod"));
    const want = Number(fd.get("slot"));
    const slot = mod === "Tiebreaker" ? 0 : want - 1;
    if (!Number.isInteger(beatmapId) || beatmapId <= 0 || !MODS[mod] || !Number.isInteger(slot) || slot < 0 || slot > 19) return { ok: false, error: "invalid" };
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
    await db.insert(poolSuggestions).values({ stageId, mod, slot, osuId, ...data });
    return { stageId, mod, slot: slot + 1, beatmapId, title: data.title, version: data.version };
  });
}

export async function voteSuggestion(id: number, score: number, note: string) {
  return guard("poolVote", "pool.vote", async (osuId) => {
    const text = String(note ?? "")
      .trim()
      .slice(0, 300);
    if (!Number.isInteger(score) || score < 1 || score > 10 || text.length < 2) return { ok: false, error: "invalid" };
    const [s] = await db.select().from(poolSuggestions).where(eq(poolSuggestions.id, id)).limit(1);
    if (!s) return { ok: false, error: "notFound" };
    if (s.osuId === osuId || (await slotPicked(s.stageId, s.mod, s.slot))) return { ok: false, error: "taken" };
    await db
      .insert(poolVotes)
      .values({ suggestionId: id, osuId, score, note: text })
      .onConflictDoUpdate({ target: [poolVotes.suggestionId, poolVotes.osuId], set: { score, note: text } });
    await settle(osuId, s.stageId, s.mod, s.slot);
    return { id, score, title: s.title, version: s.version };
  });
}

export async function removeSuggestion(id: number) {
  return guard("poolEdit", "pool.unsuggest", async (osuId) => {
    const [s] = await db.select().from(poolSuggestions).where(eq(poolSuggestions.id, id)).limit(1);
    if (!s) return { ok: false, error: "notFound" };
    const viewer = await getViewer();
    if (s.picked || (s.osuId !== osuId && !can(viewer?.roles, "phase"))) return { ok: false, error: "forbidden" };
    await db.delete(poolSuggestions).where(eq(poolSuggestions.id, id));
    await settle(osuId, s.stageId, s.mod, s.slot);
    return { id, title: s.title, version: s.version };
  });
}

export async function pickNow(stageId: number, mod: string, slot: number) {
  return guard("phase", "pool.force", async (osuId) => {
    await settle(osuId, stageId, mod, slot, true);
    return { stageId, mod, slot: slot + 1 };
  });
}

export async function pickSuggestion(id: number) {
  return guard("phase", "pool.force", async (osuId) => {
    const [s] = await db.select().from(poolSuggestions).where(eq(poolSuggestions.id, id)).limit(1);
    if (!s) return { ok: false, error: "notFound" };
    await settle(osuId, s.stageId, s.mod, s.slot, true, id);
    return { stageId: s.stageId, mod: s.mod, slot: s.slot + 1 };
  });
}
