import "server-only";
import { applyMod, MOD_ACRONYM } from "./mods";
import { getBeatmap, getStarRating } from "./osu-api";

export async function fetchMap(beatmapId: number, mod: string) {
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

export const parseBeatmapId = (v: FormDataEntryValue | null) => Number(/(\d+)\s*$/.exec(String(v ?? "").trim())?.[1]);
