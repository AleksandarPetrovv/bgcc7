import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "./index";
import { pickems, registrations, users } from "./schema";
import { resolve, score } from "@/lib/pickems";

export type LeaderRow = { osuId: number; username: string; avatarUrl: string | null; points: number; correct: number };

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error("[db]", e);
    return fallback;
  }
}

export const getPicks = (osuId: number) =>
  safe(async () => {
    const [row] = await db.select({ picks: pickems.picks }).from(pickems).where(eq(pickems.osuId, osuId)).limit(1);
    return row ? resolve(row.picks).picks : null;
  }, null);

export const getBracketOf = (osuId: number) =>
  safe(async () => {
    const [row] = await db
      .select({ osuId: users.osuId, username: users.username, avatarUrl: users.avatarUrl, picks: pickems.picks })
      .from(users)
      .leftJoin(pickems, eq(pickems.osuId, users.osuId))
      .where(eq(users.osuId, osuId))
      .limit(1);
    if (!row) return null;
    const picks = row.picks ? resolve(row.picks).picks : null;
    return { ...row, picks, ...(picks ? score(picks) : { points: 0, correct: 0 }) };
  }, null);

export const getLeaderboard = () =>
  safe(async () => {
    const rows = await db
      .select({ osuId: users.osuId, username: users.username, avatarUrl: users.avatarUrl, picks: pickems.picks })
      .from(pickems)
      .innerJoin(users, eq(users.osuId, pickems.osuId));
    return rows
      .map(({ picks, ...u }): LeaderRow => ({ ...u, ...score(resolve(picks).picks) }))
      .sort((a, b) => b.points - a.points || b.correct - a.correct || a.username.localeCompare(b.username));
  }, [] as LeaderRow[]);

export const isRegistered = (osuId: number) =>
  safe(async () => {
    const [row] = await db.select({ osuId: registrations.osuId }).from(registrations).where(eq(registrations.osuId, osuId)).limit(1);
    return !!row;
  }, false);

export const getSignupCount = () =>
  safe(async () => {
    const [row] = await db.select({ n: count() }).from(registrations);
    return row?.n ?? 0;
  }, 0);
