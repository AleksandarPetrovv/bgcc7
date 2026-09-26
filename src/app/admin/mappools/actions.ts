"use server";

import { and, asc, desc, eq } from "drizzle-orm";
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

export async function renameStage(id: number, _: ActionResult, fd: FormData) {
  return guard("phase", "stage.rename", async () => {
    const title = String(fd.get("title") ?? "")
      .trim()
      .slice(0, 40);
    if (!title) return { ok: false, error: "invalid" };
    await db.update(stages).set({ title }).where(eq(stages.id, id));
    return { id, title };
  });
}

export async function setReleased(id: number, poolReleased: boolean) {
  return guard("mappools", "stage.update", async () => {
    await db.update(stages).set({ poolReleased: !!poolReleased }).where(eq(stages.id, id));
    return { id, poolReleased: !!poolReleased };
  });
}

export async function addMap(stageId: number, _: ActionResult, fd: FormData) {
  return guard("mappools", "map.add", async () => {
    const beatmapId = Number(/(\d+)\s*$/.exec(String(fd.get("beatmap") ?? "").trim())?.[1]);
    const mod = String(fd.get("mod"));
    if (!Number.isInteger(beatmapId) || beatmapId <= 0 || !MODS[mod]) return { ok: false, error: "invalid" };
    const data = await fetchMap(beatmapId, mod);
    if (!data) return { ok: false, error: "notFound" };
    const siblings = await db
      .select({ id: maps.id, order: maps.order })
      .from(maps)
      .where(and(eq(maps.stageId, stageId), eq(maps.mod, mod)))
      .orderBy(desc(maps.order));
    const want = Number(fd.get("slot"));
    const at = Number.isInteger(want) && want >= 1 && want <= 99 ? want - 1 : siblings.length ? siblings[0].order + 1 : 0;
    if (siblings.some((s) => s.order === at)) {
      for (const s of siblings.filter((s) => s.order >= at))
        await db
          .update(maps)
          .set({ order: s.order + 1 })
          .where(eq(maps.id, s.id));
    }
    await db.insert(maps).values({ stageId, mod, order: at, ...data });
    return { stageId, mod, slot: at + 1, beatmapId, title: data.title };
  });
}

export async function moveMap(id: number, dir: -1 | 1) {
  return guard("mappools", "map.move", async () => {
    const [m] = await db.select().from(maps).where(eq(maps.id, id)).limit(1);
    if (!m) return { ok: false, error: "notFound" };
    const siblings = await db
      .select({ id: maps.id, order: maps.order })
      .from(maps)
      .where(and(eq(maps.stageId, m.stageId), eq(maps.mod, m.mod)))
      .orderBy(asc(maps.order), asc(maps.id));
    const i = siblings.findIndex((s) => s.id === id);
    const other = siblings[i + dir];
    if (!other) return { id };
    await db.update(maps).set({ order: other.order }).where(eq(maps.id, id));
    await db.update(maps).set({ order: m.order }).where(eq(maps.id, other.id));
    return { id, dir, title: m.title, version: m.version };
  });
}

export async function deleteMap(id: number) {
  return guard("mappools", "map.delete", async () => {
    const [row] = await db.delete(maps).where(eq(maps.id, id)).returning({ title: maps.title, version: maps.version, stageId: maps.stageId });
    return { id, ...row };
  });
}
