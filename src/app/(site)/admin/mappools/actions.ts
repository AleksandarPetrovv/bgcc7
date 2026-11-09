"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { maps, stages } from "@/db/schema";
import { guard } from "@/lib/admin-action";
import { later, postPool } from "@/db/discord-bot";
import { fetchMap } from "@/lib/fetch-map";
import type { ActionResult } from "@/lib/action-result";
import { blueprintFor, clearPack, slotBeatmapId } from "@/db/mappools";

export async function setReleased(id: number, poolReleased: boolean) {
  return guard("host", "stage.update", async () => {
    await db.update(stages).set({ poolReleased: !!poolReleased }).where(eq(stages.id, id));
    if (poolReleased) later("pool", () => postPool(id));
    return { log: { id, poolReleased: !!poolReleased } };
  });
}


export async function setSlotMap(stageId: number, mod: string, slot: number, _: ActionResult, fd: FormData) {
  return guard("host", "map.add", async () => {
    const beatmapId = await slotBeatmapId(stageId, mod, slot, fd.get("beatmap"));
    if (!beatmapId) return { ok: false, error: "invalid" };
    const data = await fetchMap(beatmapId, mod);
    if (!data) return { ok: false, error: "notFound" };
    await db.transaction(async (tx) => {
      await tx.delete(maps).where(and(eq(maps.stageId, stageId), eq(maps.mod, mod), eq(maps.order, slot)));
      await tx.insert(maps).values({ stageId, mod, order: slot, ...data });
    });
    await clearPack(stageId);
    return { log: { stageId, mod, slot: slot + 1, beatmapId, title: data.title } };
  });
}

export async function moveMap(id: number, dir: -1 | 1) {
  return guard("host", "map.move", async () => {
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
    await db.transaction(async (tx) => {
      if (other) await tx.update(maps).set({ order: m.order }).where(eq(maps.id, other.id));
      await tx.update(maps).set({ order: to }).where(eq(maps.id, id));
    });
    await clearPack(m.stageId);
    return { log: { id, dir, title: m.title, version: m.version } };
  });
}

export async function deleteMap(id: number) {
  return guard("host", "map.delete", async () => {
    const [row] = await db.delete(maps).where(eq(maps.id, id)).returning({ title: maps.title, version: maps.version, stageId: maps.stageId });
    if (row) await clearPack(row.stageId);
    return { log: { id, ...row } };
  });
}
