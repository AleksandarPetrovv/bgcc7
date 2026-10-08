import type { Scoreboard } from "./scoreboard";

export type Cost = { id: number; name: string; avatar: string; team: 1 | 2; maps: number; score: number; acc: number; cost: number };

const FLAT = 0.5;
const PART_BASE = 1.5;
const PART_EXP = 0.6;
const MOD_BONUS = 0.02;
const TB_FACTOR = 0.25;
const TB_MAX = 0.5;

export { MEDAL, MEDAL_BG } from "./theme";

export function matchCosts(data: Scoreboard, finished: boolean): Cost[] {
  const games = data.maps.filter((m) => !m.note).map((m) => ({ m, scores: m.players.flatMap((side, k) => side.filter((p) => p.score > 0).map((p) => ({ p, team: (k + 1) as 1 | 2 }))) })).filter((g) => g.scores.length);
  if (!games.length) return [];
  const users = new Map<number, { base: Omit<Cost, "cost" | "acc">; ratios: number[]; accSum: number; mods: Set<string> }>();
  for (const g of games) {
    const avg = g.scores.reduce((n, s) => n + s.p.score, 0) / g.scores.length;
    for (const { p, team } of g.scores) {
      const u = users.get(p.id) ?? { base: { id: p.id, name: p.name, avatar: p.avatar, team, maps: 0, score: 0 }, ratios: [], accSum: 0, mods: new Set<string>() };
      u.base.maps++;
      u.base.score += p.score;
      u.accSum += p.acc;
      u.ratios.push(p.score / avg);
      u.mods.add([...p.mods].sort().join(""));
      users.set(p.id, u);
    }
  }
  const wins = games.reduce((w, g) => (g.m.winner ? (w[g.m.winner - 1]++, w) : w), [0, 0]);
  const tb = finished && games.length > 4 && Math.abs(wins[0] - wins[1]) === 1 ? games[games.length - 1] : null;
  return [...users.values()]
    .map(({ base, ratios, accSum, mods }) => {
      const n = ratios.length;
      const perf = ratios.reduce((a, b) => a + b, 0) / n + FLAT;
      const exp = games.length <= 1 ? 0 : (n - 1) / (games.length - 1);
      const part = PART_BASE ** (exp ** PART_EXP);
      const modF = mods.size > 2 ? 1 + MOD_BONUS * (mods.size - 2) : 1;
      const tbBonus = tb && tb.scores.some((s) => s.p.id === base.id) ? Math.min(TB_MAX, TB_FACTOR * ratios[n - 1]) : 0;
      return { ...base, acc: accSum / n, cost: perf * part * modF + tbBonus };
    })
    .sort((a, b) => b.cost - a.cost);
}
