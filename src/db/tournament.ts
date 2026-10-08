import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { matches, sponsors, teamMembers, teams, users } from "./schema";
import { safe } from "./safe";
import { mpIds } from "./lobbies";
import type { Match, Player, Sponsor, Team } from "@/lib/data";
import { optImg } from "@/lib/img";
import { isTestTeam, TEST_MATCH } from "@/lib/format";

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
          avatar: users.avatarUrl,
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
          avatar: m.avatar ?? `https://a.ppy.sh/${m.userId}`,
          country: m.country ?? "",
          pp: m.pp ?? 0,
          rank: m.rank ?? 0,
          countryRank: m.countryRank ?? 0,
          accuracy: m.accuracy ?? 0,
          isCaptain: m.isCaptain,
        }))
        .sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain) || b.pp - a.pp);
      const ranked = players.filter((p) => p.rank > 0);
      return {
        id: t.id,
        name: t.name,
        image: optImg(t.image || players[0]?.avatar || ""),
        rawImage: t.image || players[0]?.avatar || "",
        players,
        avgRank: ranked.length ? Math.round(ranked.reduce((n, p) => n + p.rank, 0) / ranked.length) : 0,
        avgPp: players.length ? Math.round(players.reduce((n, p) => n + p.pp, 0) / players.length) : 0,
        seed: t.seed,
      };
    });
  }, [] as Team[]),
);

export type MatchRow = typeof matches.$inferSelect;

export const getAllMatchRows = cache(() => safe(() => db.select().from(matches).orderBy(asc(matches.order)), [] as MatchRow[]));
export const getMatchRows = cache(async () => (await getAllMatchRows()).filter((m) => m.id !== TEST_MATCH.id));

export const getMatches = cache(async (): Promise<Match[]> => (await getAllMatches()).filter((m) => m.id !== TEST_MATCH.id));

export const getAllMatches = cache(async (): Promise<Match[]> => {
  const [rows, ts] = await Promise.all([getAllMatchRows(), getAllTeams()]);
  const name = (id: string | null) => ts.find((t) => t.id === id)?.name ?? "TBD";
  return rows.map((m) => ({
    id: m.id,
    datetime: m.startsAt?.toISOString() ?? null,
    team1: { id: m.team1Id ?? "", name: name(m.team1Id), score: m.score1 },
    team2: { id: m.team2Id ?? "", name: name(m.team2Id), score: m.score2 },
    winner: m.winner === 1 || m.winner === 2 ? m.winner : null,
    links: mpIds(m.mpLinks),
    round: m.round,
    bracket: m.bracket as Match["bracket"],
    stage: m.stageSlug,
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
