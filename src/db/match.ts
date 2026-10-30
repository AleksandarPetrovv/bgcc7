import "server-only";
import { eq } from "drizzle-orm";
import { db, detached, type Tx } from "./index";
import { matches, reschedules } from "./schema";
import { advance } from "./bracket";
import { lockMatch, notifyCaptain, staffOverride } from "./schedule";
import { getAllTeams } from "./tournament";
import type { Match } from "@/lib/data";
import { decideWinner, type Score } from "@/lib/result";
import { alertId, clear, describeMatch, osuIdOf, raise } from "@/lib/alerts";
import { when } from "@/lib/discord-text";

/**
 * the one way a result is saved: writes score and winner when they changed and moves the bracket on, then posts a decided result.
 * returns false when saving failed; a decided result that failed raises an alert so staff can retry
 */
export async function settleResult(match: Pick<Match, "id" | "referee">, score: Score, firstTo: number) {
  const winner = decideWinner(score, firstTo);
  const alert = alertId("finishFailed", match.id);
  try {
    const changed = await db.transaction(async (tx) => {
      const cur = await lockMatch(tx, match.id);
      if (!cur || (cur.score1 === score[0] && cur.score2 === score[1] && cur.winner === winner)) return false;
      await tx.update(matches).set({ score1: score[0], score2: score[1], winner }).where(eq(matches.id, match.id));
      await advance(tx);
      return true;
    });
    clear(alert);
    if (changed && winner) void import("./discord-bot").then((d) => d.later("result", () => d.postResult(match.id)));
    return true;
  } catch (e) {
    console.error("[match result]", match.id, e);
    if (winner) {
      const info = await describeMatch(match.id);
      raise({ id: alert, kind: "finishFailed", level: "red", match: info, href: `/admin/matches/${info.slug}`, detail: e instanceof Error ? e.message : String(e) }, { hosts: true, osuIds: [await osuIdOf(match.referee)] });
    }
    return false;
  }
}

/** staff sets a match time inside the caller's transaction: overrides the captains' requests and logs it in the reschedule history */
export async function setMatchTime(tx: Tx, m: { id: string; team1Id: string | null }, at: Date | null, by: number) {
  await staffOverride(tx, m.id, by);
  await tx.update(matches).set({ startsAt: at }).where(eq(matches.id, m.id));
  if (at && m.team1Id) await tx.insert(reschedules).values({ matchId: m.id, teamId: m.team1Id, requestedBy: by, proposedAt: at, status: "staff", decidedBy: by });
}

/** after a staff time change: a note in both team channels, and a DM to each captain when asked */
export function announceMatchTime(teams: [string | null, string | null], at: Date, { dm }: { dm: boolean }) {
  const [t1, t2] = teams;
  detached("schedule", async () => {
    if (dm) await Promise.all([t1, t2].filter((t): t is string => !!t).map((t) => notifyCaptain(t, (link) => `Staff set your match to **${when(at)}**. ${link}`).catch(() => {})));
    if (!t1 || !t2) return;
    const ts = await getAllTeams();
    const name = (x: string) => ts.find((t) => t.id === x)?.name ?? x;
    const { teamNote } = await import("./discord-bot");
    await teamNote({ [t1]: `Staff set your match against **${name(t2)}** to **${when(at)}**.`, [t2]: `Staff set your match against **${name(t1)}** to **${when(at)}**.` });
  });
}
