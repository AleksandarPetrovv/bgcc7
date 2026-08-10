import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { lobbies, qualScores, users } from "./schema";
import { safe } from "./queries";
import { getQualifierMaps } from "./mappools";
import type { QualMap, QualPlayer } from "@/lib/data";
import { rankQualifiers } from "@/lib/qualifiers";

export type QualResults = { maps: QualMap[]; players: QualPlayer[] };

export const getQualResults = cache(async (): Promise<QualResults> => {
  const pool = await getQualifierMaps();
  const maps: QualMap[] = pool.map((m) => ({
    slot: m.slot,
    title: m.title,
    version: m.version,
    creator: m.creator,
    sr: m.sr,
    bpm: m.bpm,
    cover: m.cover,
    id: m.id,
    length: m.length,
  }));
  const rows = await safe(
    () =>
      db
        .select({
          osuId: qualScores.osuId,
          beatmapId: qualScores.beatmapId,
          score: qualScores.score,
          acc: qualScores.acc,
          mods: qualScores.mods,
          grade: qualScores.grade,
          lobby: lobbies.name,
          username: users.username,
          avatar: users.avatarUrl,
          cc: users.country,
        })
        .from(qualScores)
        .innerJoin(users, eq(users.osuId, qualScores.osuId))
        .leftJoin(lobbies, eq(lobbies.id, qualScores.lobbyId)),
    [],
  );
  const players = new Map(rows.map((r) => [r.osuId, { osuId: r.osuId, username: r.username, avatar: r.avatar ?? "", cc: r.cc ?? "" }]));
  const scores = rows.filter((r) => maps.some((m) => m.id === r.beatmapId)).map((r) => ({ ...r, lobby: r.lobby ?? "" }));
  return { maps, players: rankQualifiers(maps, scores, players) };
});

export const getQualScoreRows = () =>
  safe(() => db.select().from(qualScores), [] as (typeof qualScores.$inferSelect)[]);
