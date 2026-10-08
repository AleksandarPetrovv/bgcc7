import "server-only";
import { db } from "./index";
import { userNames, users } from "./schema";
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
  await db.insert(users).values({ osuId: u.id, ...row }).onConflictDoUpdate({ target: users.osuId, set: row });
  await db.insert(userNames).values({ osuId: u.id, username: u.username }).onConflictDoNothing();
}
