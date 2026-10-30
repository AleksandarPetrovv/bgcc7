import "server-only";
import { eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, dbOf } from "./index";
import { lobbies, matches, refApps, userNames, users } from "./schema";
import type { OsuUserFull } from "@/lib/osu-api";
import { tourneyBadges } from "@/lib/bws";
import { EDITIONS } from "@/lib/format";
import { ircName } from "@/lib/names";
import { joinStaff, staffNames } from "@/lib/staff-names";

/** osu ids of everyone named in a staff field (referee, streamer); names match case-insensitively */
export async function staffIds(field: string | null | undefined) {
  const names = staffNames(field).map((n) => n.toLowerCase());
  if (!names.length) return [];
  const rows = await db.select({ osuId: users.osuId }).from(users).where(inArray(sql`lower(${users.username})`, names)).catch(() => []);
  return rows.map((r) => r.osuId);
}

export async function saveOsuUser(u: OsuUserFull) {
  const row = {
    username: u.username,
    avatarUrl: u.avatar_url,
    country: u.country_code,
    rank: u.statistics?.global_rank ?? null,
    countryRank: u.statistics?.country_rank ?? null,
    pp: u.statistics?.pp ?? null,
    accuracy: u.statistics?.hit_accuracy ?? null,
    ...(u.badges ? { badges: tourneyBadges(u.badges) } : {}),
    statsAt: new Date(),
    updatedAt: new Date(),
  };
  await carryRename(u.id, u.username);
  await db.insert(users).values({ osuId: u.id, ...row }).onConflictDoUpdate({ target: users.osuId, set: row });
  await db.insert(userNames).values({ osuId: u.id, username: u.username }).onConflictDoNothing();
}

/** staff slots and the helper's irc login are stored by name; call before saving the new username */
export async function carryRename(osuId: number, name: string) {
  const [old] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, osuId)).limit(1);
  if (!old || old.username === name) return;
  const was = old.username.toLowerCase();
  const swap = (list: string | null) => list && joinStaff(staffNames(list).map((x) => (x.toLowerCase() === was ? name : x)));
  for (const d of EDITIONS.map(dbOf)) {
    for (const t of [matches, lobbies]) {
      const refs = await d.select({ id: t.id, referee: t.referee }).from(t).where(ilike(t.referee, `%${old.username}%`));
      for (const r of refs) await d.update(t).set({ referee: swap(r.referee) }).where(eq(t.id, r.id));
    }
    const rows = await d.select({ id: matches.id, streamer: matches.streamer, commentators: matches.commentators }).from(matches).where(or(ilike(matches.streamer, `%${old.username}%`), ilike(matches.commentators, `%${old.username}%`)));
    for (const r of rows) await d.update(matches).set({ streamer: swap(r.streamer), commentators: swap(r.commentators) }).where(eq(matches.id, r.id));
  }
  await db.update(refApps).set({ ircName: ircName(name) }).where(eq(refApps.osuId, osuId));
}
