import type { Match } from "./data";
import { FEED } from "./pickems";
import type { Dict } from "./i18n/dict";

export function matchLabel(t: Dict, matches: Match[], id: string) {
  const m = matches.find((x) => x.id === id);
  if (!m) return t.common.tbd;
  const same = matches.filter((o) => o.round === m.round);
  const name = t.rounds[m.round] ?? m.round;
  return same.length > 1 ? `${name} #${same.indexOf(m) + 1}` : name;
}

export function sourceLabel(t: Dict, matches: Match[], id: string, slot: 1 | 2) {
  const src = FEED[id]?.[slot - 1];
  if (!src) return t.common.tbd;
  const label = matchLabel(t, matches, src.from);
  return src.take === "W" ? t.common.winnerOf(label) : t.common.loserOf(label);
}

export const isLive = (m: Match) => m.links.length > 0 && !m.winner && !!m.team1.id && !!m.team2.id;

const ROUND_SLUG: Record<string, string> = {
  "WB-R1": "w-qf", "WB-R2": "w-sf", "WB-R3": "w-f",
  "LB-R1": "l-qf", "LB-R2": "l-sf", "LB-R3": "l-po", "LB-R4": "l-f",
  GF: "gf",
};
const SINGLE = new Set(["WB-R3", "LB-R3", "LB-R4"]);

export function matchSlug(id: string) {
  if (id === "GF-M1") return "gf";
  if (id === "GF-M2") return "gf-reset";
  const m = id.match(/^([WL]B-R\d)-M(\d+)$/);
  if (!m || !ROUND_SLUG[m[1]]) return id.toLowerCase();
  return SINGLE.has(m[1]) ? ROUND_SLUG[m[1]] : `${ROUND_SLUG[m[1]]}-${m[2]}`;
}

export function matchIdFromSlug(slug: string) {
  const s = slug.toLowerCase();
  if (s === "gf") return "GF-M1";
  if (s === "gf-reset") return "GF-M2";
  for (const [round, base] of Object.entries(ROUND_SLUG)) {
    if (round === "GF") continue;
    if (SINGLE.has(round) ? s === base : s.startsWith(`${base}-`)) return SINGLE.has(round) ? `${round}-M1` : `${round}-M${s.slice(base.length + 1)}`;
  }
  return slug.toUpperCase();
}
