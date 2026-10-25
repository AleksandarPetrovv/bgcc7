import type { Match } from "./data";
import type { Format } from "./format";
import type { Dict } from "./i18n/dict";

export { matchIdFromSlug, matchSlug } from "./format";

/** the fields a lobby, finish or captain can change while a staff form is open */
export const matchStamp = (m: { team1Id: string | null; team2Id: string | null; score1: number | null; score2: number | null; winner: number | null; mpLinks: string; startsAt: Date | null }) =>
  JSON.stringify([m.team1Id, m.team2Id, m.score1, m.score2, m.winner, m.mpLinks, m.startsAt?.getTime() ?? null]);

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

export const isLive = (m: Match) => m.links.length > 0 && !m.winner && !!m.team1.id && !!m.team2.id;
