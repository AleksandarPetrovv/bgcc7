import "server-only";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, db6, db7 } from "./index";
import { lobbies, matches, refApps, userNames, users } from "./schema";
import type { OsuUserFull } from "@/lib/osu-api";
import { tourneyBadges } from "@/lib/bws";

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
  const swap = (list: string | null) => list && list.split(",").map((x) => (x.trim().toLowerCase() === was ? name : x.trim())).join(", ");
  for (const d of [db6, db7]) {
    for (const t of [matches, lobbies]) await d.update(t).set({ referee: name }).where(sql`lower(trim(${t.referee})) = ${was}`);
    const rows = await d.select({ id: matches.id, streamer: matches.streamer, commentators: matches.commentators }).from(matches).where(or(ilike(matches.streamer, `%${old.username}%`), ilike(matches.commentators, `%${old.username}%`)));
    for (const r of rows) await d.update(matches).set({ streamer: swap(r.streamer), commentators: swap(r.commentators) }).where(eq(matches.id, r.id));
  }
  await db.update(refApps).set({ ircName: name.replace(/ /g, "_") }).where(eq(refApps.osuId, osuId));
}
