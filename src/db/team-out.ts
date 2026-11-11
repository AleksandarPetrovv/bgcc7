import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { matches, teamMembers, teams } from "./schema";
import { advance } from "./bracket";
import type { OutKind } from "@/lib/out";

export type OutNote = { teamId: string; team: string; reason: string };

/**
 * rules a team out. `once` (forfeit only) gives up just its next match and it plays on in the losers bracket;
 * otherwise the team is out for good and loses every match it reaches. returns false when there is nothing to forfeit
 */
export async function ruleOut(id: string, kind: OutKind, reason: string | null, once: boolean) {
  return db.transaction(async (tx) => {
    if (once) {
      const rows = await tx.select().from(matches).orderBy(asc(matches.order)).for("update");
      const next = rows.find((m) => m.winner == null && m.ffSide == null && (m.team1Id === id || m.team2Id === id));
      if (!next) return false;
      await tx.update(matches).set({ ffSide: next.team1Id === id ? 1 : 2, ffKind: kind }).where(eq(matches.id, next.id));
    } else {
      const done = await tx.update(teams).set({ out: kind, outReason: reason, outAt: new Date(), outSeenBy: [] }).where(eq(teams.id, id)).returning({ id: teams.id });
      if (!done.length) return false;
    }
    await advance(tx);
    return true;
  });
}

/** takes a team back in and undoes its walkovers; false when the bracket already moved on past them */
export async function bringBack(id: string) {
  try {
    await db.transaction(async (tx) => {
      await tx.update(teams).set({ out: null, outReason: null, outAt: null }).where(eq(teams.id, id));
      for (const side of [1, 2] as const)
        await tx
          .update(matches)
          .set({ ffSide: null, ffKind: null, winner: null, score1: null, score2: null })
          .where(and(eq(matches.ffSide, side), eq(side === 1 ? matches.team1Id : matches.team2Id, id)));
      if ((await advance(tx)).length) throw new Late();
    });
    return true;
  } catch (e) {
    if (e instanceof Late) return false;
    throw e;
  }
}
class Late extends Error {}

/** takes back a one-match forfeit; false when there is none or the bracket already moved on past it */
export async function undoForfeit(id: string) {
  try {
    return await db.transaction(async (tx) => {
      const rows = await tx.select().from(matches).for("update");
      const mine = rows.filter((m) => (m.ffSide === 1 ? m.team1Id : m.ffSide === 2 ? m.team2Id : null) === id);
      if (!mine.length) return false;
      for (const m of mine) await tx.update(matches).set({ ffSide: null, ffKind: null, winner: null, score1: null, score2: null }).where(eq(matches.id, m.id));
      if ((await advance(tx)).length) throw new Late();
      return true;
    });
  } catch (e) {
    if (e instanceof Late) return false;
    throw e;
  }
}

/** unseen "your team was disqualified" notes for the bell */
export const outNotes = (osuId: number): Promise<OutNote[]> =>
  db
    .select({ teamId: teams.id, team: teams.name, reason: sql<string>`coalesce(${teams.outReason}, '')` })
    .from(teams)
    .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(and(eq(teamMembers.osuId, osuId), eq(teams.out, "dq"), sql`not (${osuId} = any(${teams.outSeenBy}))`));

export const seeOutNotes = (osuId: number) =>
  db
    .update(teams)
    .set({ outSeenBy: sql`array_append(${teams.outSeenBy}, ${osuId})` })
    .where(and(eq(teams.out, "dq"), sql`${teams.id} in (select team_id from team_members where osu_id = ${osuId})`, sql`not (${osuId} = any(${teams.outSeenBy}))`));
