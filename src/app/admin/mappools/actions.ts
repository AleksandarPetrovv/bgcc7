"use server";

import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { maps, stages } from "@/db/schema";
import { guard } from "@/lib/admin-action";
import { MODS } from "@/lib/data";
import { applyMod, MOD_ACRONYM } from "@/lib/mods";
import { getBeatmap, getStarRating } from "@/lib/osu-api";
import type { ActionResult } from "@/lib/roles";

async function fetchMap(beatmapId: number, mod: string) {
  const b = await getBeatmap(beatmapId);
  if (!b) return null;
  const acr = MOD_ACRONYM[mod];
  const sr = acr ? await getStarRating(beatmapId, acr).catch(() => b.difficulty_rating) : b.difficulty_rating;
  const stats = applyMod(mod, { bpm: b.bpm, length: b.total_length, ar: b.ar, od: b.accuracy, cs: b.cs });
  return {
    beatmapId,
    title: b.beatmapset.title,
    artist: b.beatmapset.artist,
    version: b.version,
    creator: b.beatmapset.creator,
    sr: Math.round(sr * 100) / 100,
    cover: b.beatmapset.covers.cover,
    ...stats,
  };
}

export async function updateStage(id: number, _: ActionResult, fd: FormData) {
  return guard("mappools", "stage.update", async () => {
    const title = String(fd.get("title") ?? "").trim().slice(0, 40);
    if (!title) return { ok: false, error: "invalid" };
    const poolReleased = fd.get("poolReleased") === "on";
    await db.update(stages).set({ title, poolReleased }).where(eq(stages.id, id));
    return { id, title, poolReleased };
  });
}

export async function addMap(stageId: number, _: ActionResult, fd: FormData) {
  return guard("mappools", "map.add", async () => {
    const beatmapId = Number(/(\d+)\s*$/.exec(String(fd.get("beatmap") ?? "").trim())?.[1]);
    const mod = String(fd.get("mod"));
    if (!Number.isInteger(beatmapId) || beatmapId <= 0 || !MODS[mod]) return { ok: false, error: "invalid" };
    const data = await fetchMap(beatmapId, mod);
    if (!data) return { ok: false, error: "notFound" };
    const [row] = await db
      .select({ n: max(maps.order) })
      .from(maps)
      .where(and(eq(maps.stageId, stageId), eq(maps.mod, mod)));
    await db.insert(maps).values({ stageId, mod, order: (row?.n ?? -1) + 1, ...data });
    return { stageId, mod, beatmapId, title: data.title };
  });
}

export async function moveMap(id: number, dir: -1 | 1) {
  return guard("mappools", "map.move", async () => {
    const [m] = await db.select().from(maps).where(eq(maps.id, id)).limit(1);
    if (!m) return { ok: false, error: "notFound" };
    const siblings = await db
      .select({ id: maps.id })
      .from(maps)
      .where(and(eq(maps.stageId, m.stageId), eq(maps.mod, m.mod)))
      .orderBy(maps.order, maps.id);
    const i = siblings.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return { id };
    const ids = siblings.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    for (const [order, sid] of ids.entries()) await db.update(maps).set({ order }).where(eq(maps.id, sid));
    return { id, dir, title: m.title, version: m.version };
  });
}

export async function deleteMap(id: number) {
  return guard("mappools", "map.delete", async () => {
    const [row] = await db.delete(maps).where(eq(maps.id, id)).returning({ title: maps.title, version: maps.version, stageId: maps.stageId });
    return { id, ...row };
  });
}

export async function refreshStage(stageId: number) {
  return guard("mappools", "stage.refreshMaps", async () => {
    const rows = await db.select().from(maps).where(eq(maps.stageId, stageId));
    let updated = 0;
    for (const m of rows) {
      const data = await fetchMap(m.beatmapId, m.mod).catch(() => null);
      if (!data) continue;
      await db.update(maps).set(data).where(eq(maps.id, m.id));
      updated++;
    }
    return { stageId, updated };
  });
}
