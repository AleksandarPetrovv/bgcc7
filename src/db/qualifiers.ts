import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { lobbies, qualScores, users } from "./schema";
import { safe } from "./safe";
import { getQualifierMaps } from "./mappools";
import type { Beatmap, QualMap, QualPlayer } from "@/lib/data";
import { rankQualifiers } from "@/lib/qualifiers";
import { avatarCol } from "./avatar";

export type QualResults = { maps: QualMap[]; players: QualPlayer[] };

/** the map fields result tables show */
export const toQualMap = (m: Beatmap): QualMap => ({ slot: m.slot, title: m.title, version: m.version, creator: m.creator, sr: m.sr, bpm: m.bpm, cover: m.cover, id: m.id, length: m.length });

export const getQualResults = cache(async (): Promise<QualResults> => {
  const maps = (await getQualifierMaps()).map(toQualMap);
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
          lobbyId: qualScores.lobbyId,
          seeded: qualScores.seeded,
          username: users.username,
          avatar: avatarCol,
          cc: users.country,
        })
        .from(qualScores)
        .innerJoin(users, eq(users.osuId, qualScores.osuId))
        .leftJoin(lobbies, eq(lobbies.id, qualScores.lobbyId)),
    [],
  );
  const players = new Map(rows.map((r) => [r.osuId, { osuId: r.osuId, username: r.username, avatar: r.avatar ?? "", cc: r.cc ?? "" }]));
  const scores = rows.filter((r) => maps.some((m) => m.id === r.beatmapId)).map((r) => ({ ...r, lobby: r.lobby ?? "", manual: r.lobbyId === null && !r.seeded }));
  return { maps, players: rankQualifiers(maps, scores, players) };
});

export const getQualScoreRows = () =>
  safe(() => db.select().from(qualScores), [] as (typeof qualScores.$inferSelect)[]);
