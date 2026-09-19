import type { Match, Team } from "./data";

export function splitAlive<T extends { osuId: number; status: string }>(rows: T[], teams: Team[], matches: Match[], phase: string) {
  const signed = rows.filter((p) => p.status !== "denied");
  const playoffs = phase === "playoffs" || phase === "finished";
  if (!playoffs) return { playoffs, players: signed, out: [] as T[] };
  const losses = new Map<string, number>();
  for (const m of matches) {
    if (!m.winner) continue;
    const loser = m.winner === 1 ? m.team2.id : m.team1.id;
    if (loser) losses.set(loser, (losses.get(loser) ?? 0) + 1);
  }
  const ids = (dead: boolean) => new Set(teams.filter((tm) => (losses.get(tm.id) ?? 0) >= 2 === dead).flatMap((tm) => tm.players.map((p) => p.userId)));
  const alive = ids(false);
  const gone = ids(true);
  return { playoffs, players: signed.filter((p) => alive.has(p.osuId)), out: rows.filter((p) => gone.has(p.osuId)) };
}
