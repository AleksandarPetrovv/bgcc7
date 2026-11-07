import "server-only";
import type { Match, QualMap, QualPlayer, Team } from "@/lib/data";
import type { PoolStage } from "./mappools";
import { scoreboardOrNull } from "./scoreboards";
import { matchCosts } from "@/lib/match-cost";

export type StageStats = { maps: QualMap[]; players: QualPlayer[]; plays: number; matches: number; topCost?: { username: string; cost: number }; topCosts: TopCost[]; costs: TopCost[] };
// acc/score: averages over the pool maps they played (plays of them)
export type TopCost = { id: number; username: string; avatar: string; cost: number; matches: number; maps: number; acc: number; score: number; plays: number };

// equal cost at two decimals: more maps played ranks higher
export const rankCosts = (xs: TopCost[]) => xs.sort((a, b) => Math.round(b.cost * 100) - Math.round(a.cost * 100) || b.maps - a.maps);

// several rounds into one: cost weighted by matches, acc/score by plays
export function mergeCosts(lists: TopCost[][]): TopCost[] {
  const all = new Map<number, TopCost>();
  for (const c of lists.flat()) {
    const o = all.get(c.id);
    if (!o) {
      all.set(c.id, { ...c });
      continue;
    }
    const n = o.matches + c.matches;
    const k = o.plays + c.plays;
    o.cost = (o.cost * o.matches + c.cost * c.matches) / n;
    if (k) {
      o.acc = (o.acc * o.plays + c.acc * c.plays) / k;
      o.score = (o.score * o.plays + c.score * c.plays) / k;
    }
    o.matches = n;
    o.maps += c.maps;
    o.plays = k;
  }
  return rankCosts([...all.values()]);
}

export async function getStageStats(stage: PoolStage, matches: Match[], teams: Team[], stages: PoolStage[]): Promise<StageStats> {
  const maps: QualMap[] = stage.pools.flatMap((p) =>
    p.maps.map((m) => ({ slot: m.slot, title: m.title, version: m.version, creator: m.creator, sr: m.sr, bpm: m.bpm, cover: m.cover, id: m.id, length: m.length })),
  );
  const inPool = new Set(maps.map((m) => m.id));
  const mine = matches.filter((m) => m.stage === stage.slug && m.links.length > 0);
  const boards = await Promise.all(
    mine.map((m) => scoreboardOrNull(m, teams, stages)),
  );

  const byPlayer = new Map<number, QualPlayer & { accSum: number; scoreSum: number; n: number }>();
  let plays = 0;
  let played = 0;
  const costs = new Map<number, { username: string; avatar: string; sum: number; n: number; maps: number }>();
  for (const sb of boards) {
    if (!sb) continue;
    for (const c of matchCosts(sb, true)) {
      const cur = costs.get(c.id) ?? { username: c.name, avatar: c.avatar, sum: 0, n: 0, maps: 0 };
      cur.sum += c.cost;
      cur.n++;
      cur.maps += c.maps;
      costs.set(c.id, cur);
    }
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
  const topCosts = rankCosts(
    [...costs.entries()].map(([id, c]) => {
      const p = byPlayer.get(id);
      return { id, username: c.username, avatar: c.avatar, cost: c.sum / c.n, matches: c.n, maps: c.maps, acc: p?.n ? p.accSum / p.n : 0, score: p?.n ? p.scoreSum / p.n : 0, plays: p?.n ?? 0 };
    }),
  );
  return { maps, players, plays, matches: played, topCost: topCosts[0], topCosts: topCosts.slice(0, 3), costs: topCosts };
}
