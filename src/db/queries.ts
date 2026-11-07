import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { getFormat } from "./edition";
import { pickems, users } from "./schema";
import { actualOf, resolve, score, seedingOf } from "@/lib/pickems";
import { safe } from "./safe";
import { getMatches } from "./tournament";
import { avatarCol } from "./avatar";

export type LeaderRow = { osuId: number; username: string; avatarUrl: string | null; points: number; correct: number };

export const getPicks = (osuId: number) =>
  safe(async () => {
    const f = getFormat();
    const [[row], ms] = await Promise.all([db.select({ picks: pickems.picks }).from(pickems).where(eq(pickems.osuId, osuId)).limit(1), getMatches()]);
    return row ? resolve(f, row.picks, seedingOf(f, ms)).picks : null;
  }, null);

export const getBracketOf = (osuId: number) =>
  safe(async () => {
    const f = getFormat();
    const [row] = await db
      .select({ osuId: users.osuId, username: users.username, avatarUrl: avatarCol, picks: pickems.picks })
      .from(users)
      .leftJoin(pickems, eq(pickems.osuId, users.osuId))
      .where(eq(users.osuId, osuId))
      .limit(1);
    if (!row) return null;
    const ms = await getMatches();
    const picks = row.picks ? resolve(f, row.picks, seedingOf(f, ms)).picks : null;
    return { ...row, picks, ...(picks ? score(f, picks, actualOf(ms)) : { points: 0, correct: 0 }) };
  }, null);

export const getLeaderboard = () =>
  safe(async () => {
    const f = getFormat();
    const [rows, ms] = await Promise.all([
      db
        .select({ osuId: users.osuId, username: users.username, avatarUrl: avatarCol, picks: pickems.picks })
        .from(pickems)
        .innerJoin(users, eq(users.osuId, pickems.osuId)),
      getMatches(),
    ]);
    const seeding = seedingOf(f, ms);
    const actual = actualOf(ms);
    return rows
      .map(({ picks, ...u }): LeaderRow => ({ ...u, ...score(f, resolve(f, picks, seeding).picks, actual) }))
      .sort((a, b) => b.points - a.points || b.correct - a.correct || a.username.localeCompare(b.username));
  }, [] as LeaderRow[]);

