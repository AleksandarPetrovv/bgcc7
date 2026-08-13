import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { matches } from "./schema";
import { FEED } from "@/lib/pickems";

export async function advance() {
  const rows = await db.select().from(matches).orderBy(matches.order);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const result = (id: string, take: "W" | "L") => {
    const m = byId.get(id);
    if (!m?.winner || !m.team1Id || !m.team2Id) return null;
    const w = m.winner === 1 ? m.team1Id : m.team2Id;
    return take === "W" ? w : w === m.team1Id ? m.team2Id : m.team1Id;
  };
  for (const r of rows) {
    const feed = FEED[r.id];
    if (!feed || r.manual) continue;
    const team1Id = result(feed[0].from, feed[0].take);
    const team2Id = result(feed[1].from, feed[1].take);
    if (team1Id !== r.team1Id || team2Id !== r.team2Id) {
      await db.update(matches).set({ team1Id, team2Id }).where(eq(matches.id, r.id));
      byId.set(r.id, { ...r, team1Id, team2Id });
    }
  }
}

export async function finishMatch(id: string, score: [number, number]) {
  const winner = score[0] > score[1] ? 1 : 2;
  const done = await db
    .update(matches)
    .set({ score1: score[0], score2: score[1], winner })
    .where(and(eq(matches.id, id), isNull(matches.winner)))
    .returning({ id: matches.id });
  if (done.length) await advance();
  return done.length > 0;
}
