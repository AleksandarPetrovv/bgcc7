import "server-only";
import type { Match, QualMap, QualPlayer, Team } from "@/lib/data";
import type { PoolStage } from "./mappools";
import { getScoreboard } from "./scoreboards";

export type StageStats = { maps: QualMap[]; players: QualPlayer[]; plays: number; matches: number };

export async function getStageStats(stage: PoolStage, matches: Match[], teams: Team[], stages: PoolStage[]): Promise<StageStats> {
  const maps: QualMap[] = stage.pools.flatMap((p) =>
    p.maps.map((m) => ({ slot: m.slot, title: m.title, version: m.version, creator: m.creator, sr: m.sr, bpm: m.bpm, cover: m.cover, id: m.id, length: m.length })),
  );
  const inPool = new Set(maps.map((m) => m.id));
  const mine = matches.filter((m) => m.stage === stage.slug && m.links.length > 0);
  const boards = await Promise.all(
    mine.map((m) => Promise.race([getScoreboard(m, teams, stages), new Promise<null>((r) => setTimeout(() => r(null), 5000))]).catch(() => null)),
  );

  const byPlayer = new Map<number, QualPlayer & { accSum: number; scoreSum: number; n: number }>();
  let plays = 0;
  let played = 0;
  for (const sb of boards) {
    if (!sb) continue;
    let any = false;
    for (const map of sb.maps) {
      if (map.note || !inPool.has(map.beatmapId)) continue;
      any = true;
      for (const side of map.players)
        for (const p of side) {
          if (p.score <= 0) continue;
          plays++;
          const cur = byPlayer.get(p.id) ?? { id: p.id, username: p.name, avatar: p.avatar, cc: "", avgAcc: 0, avgScore: 0, zSum: 0, perf: {}, accSum: 0, scoreSum: 0, n: 0 };
          cur.accSum += p.acc * 100;
          cur.scoreSum += p.score;
          cur.n++;
          const prev = cur.perf[map.beatmapId];
          if (!prev || p.score > prev.score)
            cur.perf[map.beatmapId] = { score: p.score, acc: p.acc * 100, placement: 0, percentile: 0, mods: p.mods.join(""), rank: p.rank, matchName: "" };
          byPlayer.set(p.id, cur);
        }
    }
    if (any) played++;
  }

  const players: QualPlayer[] = [...byPlayer.values()]
    .map(({ accSum, scoreSum, n, ...p }) => ({ ...p, avgAcc: n ? accSum / n : 0, avgScore: n ? scoreSum / n : 0, zSum: scoreSum }))
    .sort((a, b) => b.zSum - a.zSum);
  return { maps, players, plays, matches: played };
}
