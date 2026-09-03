import type { QualMap, QualPerf, QualPlayer } from "./data";

export type ScoreIn = { osuId: number; beatmapId: number; score: number; acc: number; mods: string; grade: string; lobby: string; manual?: boolean };
export type PlayerIn = { osuId: number; username: string; avatar: string; cc: string };

function erf(x: number) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

export function rankQualifiers(maps: QualMap[], scores: ScoreIn[], players: Map<number, PlayerIn>): QualPlayer[] {
  const perf = new Map<number, Record<string, QualPerf>>();
  for (const m of maps) {
    const rows = scores.filter((s) => s.beatmapId === m.id).sort((a, b) => b.score - a.score);
    if (!rows.length) continue;
    const mean = rows.reduce((n, r) => n + r.score, 0) / rows.length;
    const sd = Math.sqrt(rows.reduce((n, r) => n + (r.score - mean) ** 2, 0) / rows.length);
    rows.forEach((r, i) => {
      const p = perf.get(r.osuId) ?? {};
      p[m.id] = {
        score: r.score,
        acc: r.acc,
        placement: i + 1,
        percentile: sd ? phi((r.score - mean) / sd) : 0.5,
        mods: r.mods,
        rank: r.grade,
        matchName: r.lobby,
        manual: r.manual,
      };
      perf.set(r.osuId, p);
    });
  }
  return [...perf.entries()]
    .map(([osuId, p]): QualPlayer => {
      const v = Object.values(p);
      const who = players.get(osuId);
      return {
        id: osuId,
        username: who?.username ?? String(osuId),
        avatar: who?.avatar ?? `https://a.ppy.sh/${osuId}`,
        cc: who?.cc ?? "",
        avgAcc: v.reduce((n, x) => n + x.acc, 0) / v.length,
        avgScore: Math.round(v.reduce((n, x) => n + x.score, 0) / v.length),
        zSum: v.reduce((n, x) => n + x.percentile, 0),
        perf: p,
      };
    })
    .sort((a, b) => b.zSum - a.zSum || b.avgScore - a.avgScore);
}
