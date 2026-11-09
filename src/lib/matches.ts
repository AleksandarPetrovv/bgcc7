import type { Match } from "./data";
import { GF, GF_RESET, matchNum, roundOf, type Format } from "./format";
import { roundName, type Dict } from "./i18n/dict";

export const matchStamp = (m: { team1Id: string | null; team2Id: string | null; score1: number | null; score2: number | null; winner: number | null; mpLinks: string; startsAt: Date | null }) =>
  JSON.stringify([m.team1Id, m.team2Id, m.score1, m.score2, m.winner, m.mpLinks, m.startsAt?.getTime() ?? null]);

const shortRound = (t: Dict, round: string) => {
  const losers = round.match(/^Losers Round (\d+)$/);
  return t.roundsShort[round] ?? (losers ? t.losersShort(losers[1]) : roundName(t, round));
};

/** "Round of 16, Match 4"; `short` gives "Round of 16, M4" */
export function matchLabel(f: Format, t: Dict, id: string, short = false) {
  if (id === GF_RESET) return t.home.gfReset;
  const round = f.rounds[roundOf(id)]?.name;
  if (!round) return t.common.tbd;
  const k = matchNum(f, id);
  return k ? `${roundName(t, round)}, ${short ? `${t.nav.match[0]}${k}` : `${t.nav.match} ${k}`}` : roundName(t, round);
}

export function sourceLabel(f: Format, t: Dict, id: string, slot: 1 | 2) {
  const src = f.feed[id]?.[slot - 1];
  if (!src) return t.common.tbd;
  const label = matchLabel(f, t, src.from);
  return src.take === "W" ? t.common.winnerOf(label) : t.common.loserOf(label);
}

// results eye: a scored match, or one with an mp link that starts within 30 min (or already started)
export const hasResults = (m: Match, now = Date.now()) =>
  m.team1.score != null || m.team2.score != null || !!m.winner ||
  (m.links.length > 0 && !!m.datetime && new Date(m.datetime).getTime() - now < 30 * 60_000);

const STARTED_WINDOW = 3 * 3600_000;
// live = its page or lobby is open; a lobby run outside the site counts for 3h after the start time once it has an mp link
export const isLive = (m: Match, now = Date.now()) =>
  !m.winner && !!m.team1.id && !!m.team2.id &&
  (!!m.running || (m.links.length > 0 && !!m.datetime && now - new Date(m.datetime).getTime() < STARTED_WINDOW && now >= new Date(m.datetime).getTime() - 3600_000));

export function cardLabels(f: Format, t: Dict, m: Match): string[] {
  if (m.id === GF) return [t.home.grandFinal, t.roundsShort["Grand Finals"]];
  if (m.id === GF_RESET) return [t.home.gfReset, ...t.home.gfResetShort];
  const k = matchNum(f, m.id);
  const short = shortRound(t, m.round);
  if (!k) return [roundName(t, m.round), short];
  return [`${roundName(t, m.round)}, ${t.nav.match} ${k}`, `${short}, ${t.nav.match} ${k}`, `${short}, ${t.nav.match[0]}${k}`];
}

export type ResultMove = { to: string; slot: 1 | 2; from: 1 | 2; team: string };

/** where a finished match sends its teams: the winner on, the loser down (nothing when the loser is out) */
export function resultMoves(f: Format, m: Match): ResultMove[] {
  if (!m.winner) return [];
  return Object.entries(f.feed).flatMap(([to, srcs]) =>
    srcs.flatMap((s, i) => {
      if (s.from !== m.id) return [];
      const from = (s.take === "W" ? m.winner : 3 - m.winner!) as 1 | 2;
      const team = from === 1 ? m.team1.id : m.team2.id;
      return team ? [{ to, slot: (i + 1) as 1 | 2, from, team }] : [];
    }),
  );
}

/** the bracket as it stood just before match `id` got its result; `scored` keeps the result itself, `landed` the teams already moved on */
export function beforeResult(f: Format, matches: Match[], id: string, { scored = false, landed = [] as string[] } = {}): Match[] {
  const m = matches.find((x) => x.id === id);
  if (!m?.winner) return matches;
  const moves = resultMoves(f, m).filter((v) => !landed.includes(v.team));
  return matches.map((x) => {
    if (x.id === id) return scored ? x : { ...x, winner: null, team1: { ...x.team1, score: null }, team2: { ...x.team2, score: null } };
    let y = x;
    for (const v of moves.filter((v) => v.to === x.id)) {
      const k = v.slot === 1 ? "team1" : "team2";
      if (y[k].id === v.team) y = { ...y, [k]: { id: "", name: "", score: null } };
    }
    return y;
  });
}

export const recentResults = (matches: Match[]) => matches.filter((m) => m.winner).sort((a, b) => (b.datetime ?? "").localeCompare(a.datetime ?? ""));

export function upcomingMatches(matches: Match[]) {
  const pending = matches.filter((m) => !m.winner);
  const sides = (m: Match) => +!!m.team1.id + +!!m.team2.id;
  return [...pending.filter((m) => m.datetime).sort((a, b) => a.datetime!.localeCompare(b.datetime!)), ...[2, 1, 0].flatMap((n) => pending.filter((m) => !m.datetime && sides(m) === n))];
}

export const wonBy = (m: Match, teamId: string) => (m.team1.id === teamId ? m.winner === 1 : m.team2.id === teamId && m.winner === 2);

export function recordOf(matches: Match[], teamId: string): [number, number] {
  const played = matches.filter((m) => m.winner && (m.team1.id === teamId || m.team2.id === teamId));
  const w = played.filter((m) => wonBy(m, teamId)).length;
  return [w, played.length - w];
}

/** the reset decides when played, else a grand final won by the upper bracket side (team1) */
export function finalResult(matches: Match[]) {
  const gf = matches.find((m) => m.id === GF);
  const reset = matches.find((m) => m.id === GF_RESET);
  const m = reset?.winner ? reset : gf?.winner === 1 ? gf : null;
  if (!m) return null;
  return m.winner === 1 ? { champion: m.team1.id, runnerUp: m.team2.id } : { champion: m.team2.id, runnerUp: m.team1.id };
}
