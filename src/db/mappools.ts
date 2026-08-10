import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { db } from "./index";
import { maps, stages } from "./schema";
import { safe } from "./queries";
import { MODS, type Beatmap } from "@/lib/data";

export type MapRow = typeof maps.$inferSelect;
export type PoolStage = {
  id: number;
  slug: string;
  title: string;
  firstTo: number | null;
  released: boolean;
  pools: { category: string; maps: (Beatmap & { rowId: number })[] }[];
};

export const MOD_ORDER = Object.keys(MODS);

export const slotOf = (mod: string, i: number) => `${MODS[mod]?.short ?? mod}${mod === "Tiebreaker" ? "" : i + 1}`;

export const getPoolStages = cache(() =>
  safe(async () => {
    const [ss, ms] = await Promise.all([
      db.select().from(stages).orderBy(asc(stages.order)),
      db.select().from(maps).orderBy(asc(maps.order), asc(maps.id)),
    ]);
    return ss.map(
      (s): PoolStage => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        firstTo: s.firstTo,
        released: s.poolReleased,
        pools: MOD_ORDER.map((mod) => ({
          category: mod,
          maps: ms
            .filter((m) => m.stageId === s.id && m.mod === mod)
            .map((m, i) => ({
              rowId: m.id,
              slot: slotOf(mod, i),
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
      }),
    );
  }, [] as PoolStage[]),
);

export async function getQualifierMaps() {
  const q = (await getPoolStages()).find((s) => s.slug === "qualifiers");
  return (q?.pools ?? []).flatMap((p) => p.maps);
}
