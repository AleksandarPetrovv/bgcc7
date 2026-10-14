import { db } from "./index";
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { drafts, matches, mpLobbies } from "./schema";
import { getFormat } from "./edition";
import { alertId, clear, describeMatch, raise } from "@/lib/alerts";

type Q = Pick<typeof db, "select" | "update">;

/** a downstream match that would get a different team although it was already played or started */
export type Blocked = { id: string; team1Id: string | null; team2Id: string | null };

export async function advance(q: Q = db) {
  const f = getFormat();
  const rows = await q.select().from(matches).orderBy(matches.order);
  const started = new Set([
    ...(await q.select({ id: drafts.matchId }).from(drafts)).map((r) => r.id),
    ...(await q.select({ id: mpLobbies.matchId }).from(mpLobbies)).map((r) => r.id),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const result = (id: string, take: "W" | "L") => {
    const m = byId.get(id);
    if (!m?.winner || !m.team1Id || !m.team2Id) return null;
    const w = m.winner === 1 ? m.team1Id : m.team2Id;
    return take === "W" ? w : w === m.team1Id ? m.team2Id : m.team1Id;
  };
  const blocked: Blocked[] = [];
  for (const r of rows) {
    const feed = f.feed[r.id];
    if (!feed || r.manual) continue;
    const team1Id = result(feed[0].from, feed[0].take);
    const team2Id = result(feed[1].from, feed[1].take);
    if (team1Id === r.team1Id && team2Id === r.team2Id) continue;
    // filling an empty slot is always fine; replacing a team that already played or started is not
    const replaces = (r.team1Id && r.team1Id !== team1Id) || (r.team2Id && r.team2Id !== team2Id);
    const played = r.winner != null || r.score1 != null || r.score2 != null || started.has(r.id);
    if (replaces && played) {
      blocked.push({ id: r.id, team1Id, team2Id });
      continue;
    }
    await q.update(matches).set({ team1Id, team2Id }).where(eq(matches.id, r.id));
    byId.set(r.id, { ...r, team1Id, team2Id });
  }
  await reportBlocked(blocked).catch((e) => console.error("[bracket alert]", e));
  return blocked;
}

async function reportBlocked(blocked: Blocked[]) {
  const id = alertId("bracketBlocked", "bracket");
  if (!blocked.length) return clear(id);
  const labels = await Promise.all(blocked.map(async (b) => (await describeMatch(b.id)).label));
  raise({ id, kind: "bracketBlocked", level: "gold", href: "/admin/matches", blocked: labels, detail: blocked.map((b) => `${b.id}: would become ${b.team1Id ?? "TBD"} vs ${b.team2Id ?? "TBD"}`).join("; ") }, { hosts: true });
}

/** saves a finished match and moves the bracket on in one transaction; false when it already had a winner */
export async function finishMatch(id: string, score: [number, number]) {
  const winner = score[0] > score[1] ? 1 : 2;
  return db.transaction(async (tx) => {
    const done = await tx
      .update(matches)
      .set({ score1: score[0], score2: score[1], winner })
      .where(and(eq(matches.id, id), isNull(matches.winner)))
      .returning({ id: matches.id });
    if (done.length) await advance(tx);
    return done.length > 0;
  });
}
