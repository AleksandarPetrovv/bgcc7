import { allMatches } from "./data";
import { FEED } from "./pickems";
import type { Dict } from "./i18n/dict";

const byId = Object.fromEntries(allMatches.map((m) => [m.id, m]));

export function matchLabel(t: Dict, id: string) {
  const m = byId[id];
  if (!m) return t.common.tbd;
  const same = allMatches.filter((o) => o.round === m.round);
  const name = t.rounds[m.round] ?? m.round;
  return same.length > 1 ? `${name} #${same.indexOf(m) + 1}` : name;
}

export function sourceLabel(t: Dict, id: string, slot: 1 | 2) {
  const src = FEED[id]?.[slot - 1];
  if (!src) return t.common.tbd;
  const label = matchLabel(t, src.from);
  return src.take === "W" ? t.common.winnerOf(label) : t.common.loserOf(label);
}
