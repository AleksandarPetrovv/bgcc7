import type { Match } from "./data";
import type { Format } from "./format";
import type { Dict } from "./i18n/dict";

export { matchIdFromSlug, matchSlug } from "./format";

/** the fields a lobby, finish or captain can change while a staff form is open */
export const matchStamp = (m: { team1Id: string | null; team2Id: string | null; score1: number | null; score2: number | null; winner: number | null; mpLinks: string; startsAt: Date | null }) =>
  JSON.stringify([m.team1Id, m.team2Id, m.score1, m.score2, m.winner, m.mpLinks, m.startsAt?.getTime() ?? null]);

const SHORT: Record<string, string> = {
  "Round of 16": "RO16",
  "Round of 32": "RO32",
  Quarterfinals: "QF",
  "Round 1 (Quarter-Finals)": "QF",
  Semifinals: "SF",
  "Semi-Finals": "SF",
  "Round 2 (Semi-Finals)": "SF",
  Finals: "F",
  "Winners Finals": "WF",
  "Losers Finals": "LF",
  "Grand Finals": "GF",
};

/** short round name for tight spots: RO16, QF, SF, F, GF, Losers R2 */
export const shortRound = (round: string) => SHORT[round] ?? round.replace(/^Losers Round (\d+)$/, "Losers R$1");

export function matchLabel(t: Dict, matches: Match[], id: string) {
  const m = matches.find((x) => x.id === id);
  if (!m) return t.common.tbd;
  const same = matches.filter((o) => o.round === m.round);
  const name = t.rounds[m.round] ?? m.round;
  return same.length > 1 ? `${name} #${same.indexOf(m) + 1}` : name;
}

export function sourceLabel(f: Format, t: Dict, matches: Match[], id: string, slot: 1 | 2) {
  const src = f.feed[id]?.[slot - 1];
  if (!src) return t.common.tbd;
  const label = matchLabel(t, matches, src.from);
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
