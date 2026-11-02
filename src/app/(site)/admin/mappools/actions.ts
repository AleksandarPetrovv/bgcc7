"use server";

import { and, eq } from "drizzle-orm";
import { currentEdition, db } from "@/db";
import { maps, stages } from "@/db/schema";
import { guard } from "@/lib/admin-action";
import { later, postPool } from "@/db/discord-bot";
import { fetchMap, parseBeatmapId } from "@/lib/fetch-map";
import type { ActionResult } from "@/lib/action-result";
import { rm } from "node:fs/promises";
import { packPath } from "@/lib/uploads";
import { MODS } from "@/lib/mods";
import { blueprintFor } from "@/db/mappools";

// a changed pool makes the uploaded pack stale, so it goes completely
async function dropPack(stageId: number) {
  const [s] = await db.update(stages).set({ packSize: null, packAt: null }).where(eq(stages.id, stageId)).returning({ slug: stages.slug });
  if (s) await rm(packPath(s.slug, currentEdition()), { force: true });
}

export async function renameStage(id: number, _: ActionResult, fd: FormData) {
  return guard("host", "stage.rename", async () => {
    const title = String(fd.get("title") ?? "")
      .trim()
      .slice(0, 40);
    if (!title) return { ok: false, error: "invalid" };
    await db.update(stages).set({ title }).where(eq(stages.id, id));
    return { log: { id, title } };
  });
}

export async function setReleased(id: number, poolReleased: boolean) {
  return guard("poolEdit", "stage.update", async () => {
    await db.update(stages).set({ poolReleased: !!poolReleased }).where(eq(stages.id, id));
    if (poolReleased) later("pool", () => postPool(id));
    return { log: { id, poolReleased: !!poolReleased } };
  });
}


export async function setSlotMap(stageId: number, mod: string, slot: number, _: ActionResult, fd: FormData) {
  return guard("poolEdit", "map.add", async () => {
    const beatmapId = parseBeatmapId(fd.get("beatmap"));
    if (!Number.isInteger(beatmapId) || beatmapId <= 0 || !MODS[mod] || !Number.isInteger(slot) || slot < 0) return { ok: false, error: "invalid" };
    const s = await blueprintFor(stageId);
    if (!s || slot >= (s.blueprint[mod] ?? 0)) return { ok: false, error: "invalid" };
    const data = await fetchMap(beatmapId, mod);
    if (!data) return { ok: false, error: "notFound" };
    await db.delete(maps).where(and(eq(maps.stageId, stageId), eq(maps.mod, mod), eq(maps.order, slot)));
    await db.insert(maps).values({ stageId, mod, order: slot, ...data });
    await dropPack(stageId);
    return { log: { stageId, mod, slot: slot + 1, beatmapId, title: data.title } };
  });
}

export async function moveMap(id: number, dir: -1 | 1) {
  return guard("poolEdit", "map.move", async () => {
    const [m] = await db.select().from(maps).where(eq(maps.id, id)).limit(1);
    if (!m) return { ok: false, error: "notFound" };
    const s = await blueprintFor(m.stageId);
    const to = m.order + dir;
    if (!s || to < 0 || to >= (s.blueprint[m.mod] ?? 0)) return { log: { id } };
    const [other] = await db
      .select({ id: maps.id })
      .from(maps)
      .where(and(eq(maps.stageId, m.stageId), eq(maps.mod, m.mod), eq(maps.order, to)))
      .limit(1);
    if (other) await db.update(maps).set({ order: m.order }).where(eq(maps.id, other.id));
    await db.update(maps).set({ order: to }).where(eq(maps.id, id));
    await dropPack(m.stageId);
    return { log: { id, dir, title: m.title, version: m.version } };
  });
}

export async function deleteMap(id: number) {
  return guard("poolEdit", "map.delete", async () => {
    const [row] = await db.delete(maps).where(eq(maps.id, id)).returning({ title: maps.title, version: maps.version, stageId: maps.stageId });
    if (row) await dropPack(row.stageId);
    return { log: { id, ...row } };
  });
}
