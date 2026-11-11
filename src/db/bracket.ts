import { db } from "./index";
import "server-only";
import { eq } from "drizzle-orm";
import { availability, drafts, matchCache, matches, mpChat, mpLobbies, reschedules, scoreEdits, stages, teams } from "./schema";
import { snapshot } from "@/lib/snapshot";
import { getFormat } from "./edition";
import { staffOverride } from "./schedule";
import { alertId, clear, describeMatch, raise } from "@/lib/alerts";
import { GF, GF_RESET } from "@/lib/format";
import { isOutKind, walkoverOf } from "@/lib/out";

/** everything that hangs off one match */
export const MATCH_CHILDREN = [drafts, matchCache, scoreEdits, reschedules, availability, mpLobbies, mpChat] as const;

type Q = Pick<typeof db, "select" | "update" | "delete">;

export type Blocked = { id: string; team1Id: string | null; team2Id: string | null };

export async function playedIds(q: Q = db) {
  const rows = await q.select({ id: matches.id, winner: matches.winner, score1: matches.score1, score2: matches.score2, mpLinks: matches.mpLinks }).from(matches);
  return new Set([
    ...rows.filter((r) => r.winner != null || r.score1 != null || r.score2 != null || !!r.mpLinks).map((r) => r.id),
    ...(await q.select({ id: drafts.matchId }).from(drafts)).map((r) => r.id),
    ...(await q.select({ id: mpLobbies.matchId }).from(mpLobbies)).map((r) => r.id),
  ]);
}

/** moves teams along the bracket; settles walkovers on the way and returns the ids it settled (see `walkoverOf`) */
/** `reflow`: a corrected result replaces teams in later matches even when those were played, wiping them (a dump is taken first); without it they are returned as blocked */
export async function advance(q: Q = db, reflow = false) {
  const f = getFormat();
  const rows = await q.select().from(matches).orderBy(matches.order);
  const played = await playedIds(q);
  const out = new Map((await q.select({ id: teams.id, out: teams.out }).from(teams)).flatMap((t) => (isOutKind(t.out) ? [[t.id, t.out] as const] : [])));
  const firstTo = new Map((await q.select({ slug: stages.slug, firstTo: stages.firstTo }).from(stages)).map((s) => [s.slug, s.firstTo]));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const result = (id: string, take: "W" | "L") => {
    const m = byId.get(id);
    if (!m) return null;
    const ff = walkoverOf(m);
    // the side that gave the match up is its loser even before the opponent is known
    if (ff) return (ff.side === 1) === (take === "L") ? m.team1Id : m.team2Id;
    if (!m.winner || !m.team1Id || !m.team2Id) return null;
    const w = m.winner === 1 ? m.team1Id : m.team2Id;
    return take === "W" ? w : w === m.team1Id ? m.team2Id : m.team1Id;
  };
  const blocked: Blocked[] = [];
  const walked: string[] = [];
  const wiped: string[] = [];
  for (const row of rows) {
    let r = row;
    const feed = f.feed[r.id];
    if (feed && !r.manual) {
      // the reset final only exists when the lower bracket side (team2) wins the grand final
      const noReset = r.id === GF_RESET && byId.get(GF)?.winner === 1;
      const team1Id = noReset ? null : result(feed[0].from, feed[0].take);
      const team2Id = noReset ? null : result(feed[1].from, feed[1].take);
      if (team1Id !== r.team1Id || team2Id !== r.team2Id) {
        const replaces = (r.team1Id && r.team1Id !== team1Id) || (r.team2Id && r.team2Id !== team2Id);
        const stale = !!replaces && played.has(r.id);
        if (stale && !reflow) {
          blocked.push({ id: r.id, team1Id, team2Id });
          continue;
        }
        if (stale) {
          if (!wiped.length) await snapshot("bracket-reflow");
          for (const t of MATCH_CHILDREN) await q.delete(t).where(eq(t.matchId, r.id));
          wiped.push(r.id);
        }
        const reset = !!replaces;
        const set = stale
          ? { team1Id, team2Id, startsAt: null, ffSide: null, ffKind: null, score1: null, score2: null, winner: null, mpLinks: "" }
          : reset
            ? { team1Id, team2Id, startsAt: null, ffSide: null, ffKind: null }
            : { team1Id, team2Id };
        await q.update(matches).set(set).where(eq(matches.id, r.id));
        if (reset) await staffOverride(q, r.id, null);
        r = { ...r, ...set };
        byId.set(r.id, r);
      }
    }
    if (r.winner != null) continue;
    const gone = r.team1Id && out.has(r.team1Id) ? 1 : r.team2Id && out.has(r.team2Id) ? 2 : null;
    const ff = walkoverOf(r) ?? (gone ? { side: gone, kind: out.get((gone === 1 ? r.team1Id : r.team2Id)!)! } : null);
    if (!ff) continue;
    const win = ff.side === 1 ? 2 : 1;
    const both = !!r.team1Id && !!r.team2Id;
    // the opponent wins at the round's first-to as soon as it is known; until then only the loser moves on
    const set = { ffSide: ff.side, ffKind: ff.kind, ...(both ? { winner: win, [win === 1 ? "score1" : "score2"]: firstTo.get(r.poolSlug ?? r.stageSlug) ?? f.firstTo } : {}) };
    await q.update(matches).set(set).where(eq(matches.id, r.id));
    byId.set(r.id, { ...r, ...set });
    if (!both) continue;
    await staffOverride(q, r.id, null);
    await q.update(drafts).set({ open: false }).where(eq(drafts.matchId, r.id));
    walked.push(r.id);
  }
  await reportBlocked(blocked).catch((e) => console.error("[bracket alert]", e));
  return Object.assign(blocked, { walked, wiped });
}

async function reportBlocked(blocked: Blocked[]) {
  const id = alertId("bracketBlocked", "bracket");
  if (!blocked.length) return clear(id);
  const labels = await Promise.all(blocked.map(async (b) => (await describeMatch(b.id)).label));
  raise({ id, kind: "bracketBlocked", level: "gold", href: "/admin/matches", blocked: labels, detail: blocked.map((b) => `${b.id}: would become ${b.team1Id ?? "TBD"} vs ${b.team2Id ?? "TBD"}`).join("; ") }, { hosts: true });
}
