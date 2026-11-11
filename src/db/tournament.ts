import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { drafts, matches, mpLobbies, sponsors, teamMembers, teams, users } from "./schema";
import { safe } from "./safe";
import type { Match, Player, Sponsor, Team } from "@/lib/data";
import { teamImg } from "@/lib/img";
import { GF, GF_RESET, isTestTeam, TEST_MATCH } from "@/lib/format";
import { avatarCol } from "./avatar";
import { avatarPath } from "@/lib/avatar";
import { mpIds } from "@/lib/mp-links";
import { isOutKind, walkoverOf } from "@/lib/out";

export const getTeams = cache(async () => (await getAllTeams()).filter((t) => !isTestTeam(t.id)));

export const getAllTeams = cache(() =>
  safe(async () => {
    const [ts, ms] = await Promise.all([
      db.select().from(teams).orderBy(asc(teams.seed), asc(teams.name)),
      db
        .select({
          teamId: teamMembers.teamId,
          isCaptain: teamMembers.isCaptain,
          userId: users.osuId,
          username: users.username,
          avatar: avatarCol,
          country: users.country,
          pp: users.pp,
          rank: users.rank,
          countryRank: users.countryRank,
          accuracy: users.accuracy,
        })
        .from(teamMembers)
        .innerJoin(users, eq(users.osuId, teamMembers.osuId)),
    ]);
    return ts.map((t): Team => {
      const players: Player[] = ms
        .filter((m) => m.teamId === t.id)
        .map((m) => ({
          userId: m.userId,
          username: m.username,
          avatar: m.avatar ?? avatarPath(m.userId),
          country: m.country ?? "",
          pp: m.pp ?? 0,
          rank: m.rank ?? 0,
          countryRank: m.countryRank ?? 0,
          accuracy: m.accuracy ?? 0,
          isCaptain: m.isCaptain,
        }))
        .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain) || b.pp - a.pp);
      // unranked players (rank 0) are left out; /me and /teams both read this
      const ranked = players.filter((p) => p.rank > 0);
      return {
        id: t.id,
        name: t.name,
        image: teamImg(t.image, players[0]?.avatar),
        rawImage: t.image || players[0]?.avatar || "",
        players,
        avgRank: ranked.length ? Math.round(ranked.reduce((n, p) => n + p.rank, 0) / ranked.length) : 0,
        avgPp: players.length ? Math.round(players.reduce((n, p) => n + p.pp, 0) / players.length) : 0,
        seed: t.seed,
        out: isOutKind(t.out) ? t.out : null,
      };
    });
  }, [] as Team[]),
);

export type MatchRow = typeof matches.$inferSelect;

/** the reset is never scheduled: its time is always the grand final's plus an hour, so every reader sees the same one */
export const getAllMatchRows = cache(() =>
  safe(async () => {
    const rows = await db.select().from(matches).orderBy(asc(matches.order));
    const gf = rows.find((m) => m.id === GF)?.startsAt;
    return rows.map((m) => (m.id === GF_RESET ? { ...m, startsAt: gf ? new Date(gf.getTime() + 36e5) : null } : m));
  }, [] as MatchRow[]),
);
export const getMatchRows = cache(async () => (await getAllMatchRows()).filter((m) => m.id !== TEST_MATCH.id));

export const getMatches = cache(async (): Promise<Match[]> => (await getAllMatches()).filter((m) => m.id !== TEST_MATCH.id));

const openMatchIds = () =>
  safe(async () => {
    const [d, l] = await Promise.all([
      db.select({ id: drafts.matchId }).from(drafts).where(eq(drafts.open, true)),
      db.select({ id: mpLobbies.matchId }).from(mpLobbies).where(eq(mpLobbies.open, true)),
    ]);
    return new Set([...d, ...l].map((r) => r.id));
  }, new Set<string>());

export const getAllMatches = cache(async (): Promise<Match[]> => {
  const [rows, ts, open] = await Promise.all([getAllMatchRows(), getAllTeams(), openMatchIds()]);
  const name = (id: string | null) => ts.find((t) => t.id === id)?.name ?? "TBD";
  return rows.map((m) => ({
    running: open.has(m.id),
    id: m.id,
    datetime: m.startsAt?.toISOString() ?? null,
    team1: { id: m.team1Id ?? "", name: name(m.team1Id), score: m.score1 },
    team2: { id: m.team2Id ?? "", name: name(m.team2Id), score: m.score2 },
    winner: m.winner === 1 || m.winner === 2 ? m.winner : null,
    walkover: walkoverOf(m),
    links: mpIds(m.mpLinks),
    round: m.round,
    bracket: m.bracket as Match["bracket"],
    stage: m.poolSlug ?? m.stageSlug,
    referee: m.referee,
    streamer: m.streamer,
    commentators: m.commentators,
    vodUrl: m.vodUrl,
  }));
});

export const getSponsors = cache(() =>
  safe(
    async () =>
      (await db.select().from(sponsors).orderBy(asc(sponsors.order), asc(sponsors.id))).map((s): Sponsor => ({ id: s.id, name: s.name, image: s.image, url: s.url })),
    [] as Sponsor[],
  ),
);
