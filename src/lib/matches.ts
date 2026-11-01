import type { Match } from "./data";
import { GF, GF_RESET, matchNum, type Format } from "./format";
import { roundName, type Dict } from "./i18n/dict";

/** the fields a lobby, finish or captain can change while a staff form is open */
export const matchStamp = (m: { team1Id: string | null; team2Id: string | null; score1: number | null; score2: number | null; winner: number | null; mpLinks: string; startsAt: Date | null }) =>
  JSON.stringify([m.team1Id, m.team2Id, m.score1, m.score2, m.winner, m.mpLinks, m.startsAt?.getTime() ?? null]);

/** short round name for tight spots: RO16, QF, SF, F, GF, Losers R2 */
const shortRound = (t: Dict, round: string) => {
  const losers = round.match(/^Losers Round (\d+)$/);
  return t.roundsShort[round] ?? (losers ? t.losersShort(losers[1]) : roundName(t, round));
};

export function matchLabel(f: Format, t: Dict, matches: Match[], id: string) {
  const m = matches.find((x) => x.id === id);
  if (!m) return t.common.tbd;
  const k = matchNum(f, id);
  return k ? `${roundName(t, m.round)} #${k}` : roundName(t, m.round);
}

export function sourceLabel(f: Format, t: Dict, matches: Match[], id: string, slot: 1 | 2) {
  const src = f.feed[id]?.[slot - 1];
  if (!src) return t.common.tbd;
  const label = matchLabel(f, t, matches, src.from);
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

// round labels, longest first; a card takes the first one that fits (Losers Round 2 Match 3 > Losers R2 Match 3 > Losers R2 M3)
export function cardLabels(f: Format, t: Dict, m: Match): string[] {
  if (m.id === GF) return [t.home.grandFinal, t.roundsShort["Grand Finals"]];
  if (m.id === GF_RESET) return [t.home.gfReset, ...t.home.gfResetShort];
  const k = matchNum(f, m.id);
  const short = shortRound(t, m.round);
  if (!k) return [roundName(t, m.round), short];
  return [`${roundName(t, m.round)} ${t.nav.match} ${k}`, `${short} ${t.nav.match} ${k}`, `${short} ${t.nav.match[0]}${k}`];
}

/** finished matches, newest first */
export const recentResults = (matches: Match[]) => matches.filter((m) => m.winner).sort((a, b) => (b.datetime ?? "").localeCompare(a.datetime ?? ""));

/** unfinished matches: soonest scheduled first, then unscheduled ones with both teams, one team, none */
export function upcomingMatches(matches: Match[]) {
  const pending = matches.filter((m) => !m.winner);
  const sides = (m: Match) => +!!m.team1.id + +!!m.team2.id;
  return [...pending.filter((m) => m.datetime).sort((a, b) => a.datetime!.localeCompare(b.datetime!)), ...[2, 1, 0].flatMap((n) => pending.filter((m) => !m.datetime && sides(m) === n))];
}

export const wonBy = (m: Match, teamId: string) => (m.team1.id === teamId ? m.winner === 1 : m.team2.id === teamId && m.winner === 2);

/** [wins, losses] over the team's finished matches */
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
