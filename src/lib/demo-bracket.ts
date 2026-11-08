import type { Match, Team } from "./data";
import { roundOf, type Format } from "./format";

/** the overlay demo's match: a losers one, so its bracket scene shows a team being knocked out */
export const DEMO_MATCH = "losers-round-2-1";
/** played after it in the demo bracket, so the scene also shows a winners match sending its loser down */
export const DEMO_WINNERS = "winners-semifinals-1";

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/**
 * a made-up bracket for the overlay demo: the real teams seeded into the first round and played through to `until`.
 * match `pairAt` gets the demo's pair instead of its own teams (`winner` wins it). null without a full set of teams
 */
export function demoBracket(f: Format, teams: Team[], pairAt: string, pair: [Team, Team], winner: 1 | 2, until = pairAt): { matches: Match[]; teams: Team[] } | null {
  if (teams.length < f.teams || !f.order.includes(pairAt) || f.order.indexOf(until) < f.order.indexOf(pairAt)) return null;
  const seeded = [...teams].sort((a, b) => a.seed - b.seed);
  const seedOf = new Map(seeded.map((t, k) => [t.id, k + 1]));
  const byId = new Map<string, Match>();
  const rename = new Map<string, string>();
  const side = (id: string) => ({ id, name: "", score: null as number | null });
  const at = f.order.indexOf(pairAt);
  const stop = f.order.indexOf(until);

  f.order.forEach((id, k) => {
    const r = f.rounds[roundOf(id)];
    const sources = f.feed[id];
    const r1 = f.order.indexOf(id) < f.r1.length ? f.r1[f.order.indexOf(id)] : null;
    const from = (i: 0 | 1) => {
      if (r1 && !sources) return seeded[r1[i] - 1]?.id ?? "";
      const s = sources?.[i];
      const m = s && byId.get(s.from);
      if (!m?.winner) return "";
      const w = m.winner === 1 ? m.team1.id : m.team2.id;
      const l = m.winner === 1 ? m.team2.id : m.team1.id;
      return s.take === "W" ? w : l;
    };
    let m: Match = { id, datetime: null, team1: side(from(0)), team2: side(from(1)), winner: null, links: [], round: r?.name ?? id, bracket: id.startsWith("winners") ? "winners" : id.startsWith("losers") ? "losers" : "grand", stage: r?.stage ?? "", referee: null, streamer: null, commentators: null, vodUrl: null };
    if (k === at) {
      rename.set(m.team1.id, pair[0].id).set(m.team2.id, pair[1].id);
      for (const [key, x] of byId) byId.set(key, { ...x, team1: { ...x.team1, id: rename.get(x.team1.id) ?? x.team1.id }, team2: { ...x.team2, id: rename.get(x.team2.id) ?? x.team2.id } });
      m = { ...m, team1: side(pair[0].id), team2: side(pair[1].id) };
    }
    if (k <= stop && m.team1.id && m.team2.id) {
      // mostly the better seed wins, now and then an upset; the demo match goes the way the demo says
      const better = (seedOf.get(m.team1.id) ?? 99) <= (seedOf.get(m.team2.id) ?? 99) ? 1 : 2;
      const w = k === at ? winner : hash(id) % 4 === 0 ? ((3 - better) as 1 | 2) : better;
      // the demo match ends firstTo to 2, like the demo's winner screen
      const lost = k === at ? 2 : hash(id + "s") % f.firstTo;
      m = { ...m, winner: w, team1: { ...m.team1, score: w === 1 ? f.firstTo : lost }, team2: { ...m.team2, score: w === 2 ? f.firstTo : lost } };
    }
    byId.set(id, m);
  });
  const gone = new Set(rename.keys());
  return { matches: f.order.map((id) => byId.get(id)!), teams: [...teams.filter((t) => !gone.has(t.id)), ...pair] };
}
