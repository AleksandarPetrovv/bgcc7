import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { rm } from "node:fs/promises";
import { currentEdition, db, dbOf } from "./index";
import { packPath } from "@/lib/uploads";
import { parseBeatmapId } from "@/lib/fetch-map";
import type { Edition } from "@/lib/format";
import { maps, stages } from "./schema";
import { safe } from "./safe";
import { getSkillLayouts } from "./format-plan";
import { skillSlot } from "@/lib/format-plan";
import { type Beatmap, type Pack } from "@/lib/data";
import { MOD_ORDER, MODS } from "@/lib/mods";
import { isBracketStage } from "@/lib/format";
import { getFormat } from "./edition";

export type MapRow = typeof maps.$inferSelect;
export type PoolStage = {
  id: number;
  slug: string;
  title: string;
  firstTo: number;
  released: boolean;
  pack: Pack | null;
  blueprint: Record<string, number>;
  pools: { category: string; maps: (Beatmap & { rowId: number; order: number })[] }[];
};

export async function blueprintFor(stageId: number) {
  const [s] = await db.select({ slug: stages.slug, blueprint: stages.blueprint }).from(stages).where(eq(stages.id, stageId)).limit(1);
  return s ?? null;
}

async function slotInBlueprint(stageId: number, mod: string, slot: number) {
  if (!MODS[mod] || !Number.isInteger(slot) || slot < 0) return false;
  const s = await blueprintFor(stageId);
  return !!s && slot < (s.blueprint[mod] ?? 0);
}

export async function slotBeatmapId(stageId: number, mod: string, slot: number, raw: FormDataEntryValue | null) {
  const id = parseBeatmapId(raw);
  return Number.isInteger(id) && id > 0 && (await slotInBlueprint(stageId, mod, slot)) ? id : null;
}

export async function setPack(stageId: number, size: number) {
  await db.update(stages).set({ packSize: size, packAt: new Date() }).where(eq(stages.id, stageId));
}

export async function clearPack(stageId: number, ed: Edition = currentEdition()) {
  const [s] = await dbOf(ed).update(stages).set({ packSize: null, packAt: null }).where(eq(stages.id, stageId)).returning({ slug: stages.slug });
  if (s) await rm(packPath(s.slug, ed), { force: true });
}

export const slotOf = (mod: string, i: number) => `${MODS[mod]?.short ?? mod}${mod === "Tiebreaker" ? "" : i + 1}`;

export const slotsOf = (bp: Record<string, number>) => MOD_ORDER.flatMap((mod) => Array.from({ length: Math.max(0, Math.floor(bp[mod] ?? 0)) }, (_, i) => ({ mod, slot: i })));

export const getPoolStages = cache(() =>
  safe(async () => {
    const [ss, ms, skills] = await Promise.all([db.select().from(stages).orderBy(asc(stages.order)), db.select().from(maps).orderBy(asc(maps.order), asc(maps.id)), getSkillLayouts()]);
    return ss.map((s): PoolStage => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      firstTo: skills?.[s.slug]?.firstTo ?? s.firstTo ?? getFormat().firstTo,
      released: s.poolReleased,
      pack: s.packSize ? { size: s.packSize, at: s.packAt?.toISOString() ?? null } : null,
      blueprint: skills?.[s.slug]?.blueprint ?? s.blueprint ?? {},
      pools: MOD_ORDER.map((mod) => ({
        category: mod,
        maps: ms
          .filter((m) => m.stageId === s.id && m.mod === mod)
          .map((m) => ({
            rowId: m.id,
            order: m.order,
            slot: skillSlot(skills?.[s.slug], mod, m.order)?.label ?? slotOf(mod, m.order),
            mod,
            title: m.title,
            version: m.version,
            creator: m.creator,
            sr: m.sr,
            bpm: m.bpm,
            length: m.length,
            ar: m.ar,
            od: m.od,
            cs: m.cs,
            cover: m.cover,
            id: m.beatmapId,
          })),
      })).filter((p) => p.maps.length),
    }));
  }, [] as PoolStage[]),
);

export const poolMaps = (stages: PoolStage[], slug: string) => (stages.find((s) => s.slug === slug)?.pools ?? []).flatMap((p) => p.maps);

export const firstToOf = (stages: PoolStage[], slug: string) => stages.find((s) => s.slug === slug)?.firstTo ?? getFormat().firstTo;

export async function getQualifierMaps() {
  const q = (await getPoolStages()).find((s) => !isBracketStage(s.slug));
  return (q?.pools ?? []).flatMap((p) => p.maps);
}
