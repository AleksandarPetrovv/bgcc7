import type { Match } from "./data";
import type { Format } from "./format";
import type { Dict } from "./i18n/dict";

export { matchIdFromSlug, matchSlug } from "./format";

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
