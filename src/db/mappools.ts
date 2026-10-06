import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "./index";
import { maps, stages } from "./schema";
import { safe } from "./safe";
import { getSkillLayouts } from "./format-plan";
import { skillSlot } from "@/lib/format-plan";
import { MODS, type Beatmap, type Pack } from "@/lib/data";

export type MapRow = typeof maps.$inferSelect;
export type PoolStage = {
  id: number;
  slug: string;
  title: string;
  firstTo: number | null;
  released: boolean;
  pack: Pack | null;
  blueprint: Record<string, number>;
  pools: { category: string; maps: (Beatmap & { rowId: number; order: number })[] }[];
};

export const MOD_ORDER = Object.keys(MODS);

export const slotOf = (mod: string, i: number) => `${MODS[mod]?.short ?? mod}${mod === "Tiebreaker" ? "" : i + 1}`;

export const slotsOf = (bp: Record<string, number>) => MOD_ORDER.flatMap((mod) => Array.from({ length: Math.max(0, Math.floor(bp[mod] ?? 0)) }, (_, i) => ({ mod, slot: i })));

export const getPoolStages = cache(() =>
  safe(async () => {
    const [ss, ms, skills] = await Promise.all([db.select().from(stages).orderBy(asc(stages.order)), db.select().from(maps).orderBy(asc(maps.order), asc(maps.id)), getSkillLayouts()]);
    return ss.map((s): PoolStage => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      firstTo: skills?.[s.slug]?.firstTo ?? s.firstTo,
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

export async function getQualifierMaps() {
  const q = (await getPoolStages()).find((s) => s.slug === "qualifiers");
  return (q?.pools ?? []).flatMap((p) => p.maps);
}
