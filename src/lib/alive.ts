import type { Match, Team } from "./data";
import { KO_LOSSES } from "./format";

type Result = { winner: number | null } & ({ team1: { id: string }; team2: { id: string } } | { team1Id: string | null; team2Id: string | null });

const loserOf = (m: Result) => {
  if (m.winner !== 1 && m.winner !== 2) return null;
  return "team1" in m ? (m.winner === 1 ? m.team2.id : m.team1.id) : m.winner === 1 ? m.team2Id : m.team1Id;
};

function lossesByTeam(results: Result[]) {
  const losses = new Map<string, number>();
  for (const m of results) {
    const loser = loserOf(m);
    if (loser) losses.set(loser, (losses.get(loser) ?? 0) + 1);
  }
  return losses;
}

export const isKnockedOut = (teamId: string, results: Result[] | Map<string, number>) => ((results instanceof Map ? results : lossesByTeam(results)).get(teamId) ?? 0) >= KO_LOSSES;

export const teamOfPlayer = (teams: Team[], osuId: number) => teams.find((t) => t.players.some((p) => p.userId === osuId));

export function splitAlive<T extends { osuId: number; status: string }>(rows: T[], teams: Team[], matches: Match[], phase: string) {
  const signed = rows.filter((p) => p.status !== "denied");
  const playoffs = phase === "playoffs" || phase === "finished";
  if (!playoffs) return { playoffs, players: signed, out: [] as T[] };
  const losses = lossesByTeam(matches);
  const ids = (dead: boolean) => new Set(teams.filter((tm) => isKnockedOut(tm.id, losses) === dead).flatMap((tm) => tm.players.map((p) => p.userId)));
  const alive = ids(false);
  const gone = ids(true);
  return { playoffs, players: signed.filter((p) => alive.has(p.osuId)), out: rows.filter((p) => gone.has(p.osuId)) };
}
