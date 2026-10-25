import "server-only";
import { eq } from "drizzle-orm";
import { currentEdition, db, siteEdition } from "@/db";
import { matches } from "@/db/schema";
import { getAllMatches, getAllTeams } from "@/db/tournament";
import { matchIdFromSlug, matchSlug } from "@/lib/format";
import { settle } from "@/db/drafts";
import { getFormat } from "@/db/edition";
import { getPoolStages, type PoolStage } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";
import { nowPlaying } from "@/lib/bancho";
import { getLive, IPC_PLAYING } from "@/lib/live-scores";
import { overlayUser, currentStreamMatch } from "@/db/stream";
import { isScene, type Scene } from "@/lib/scenes";
import type { OverlayFeed, FeedTeam, FeedMap, FeedStep, FeedGroup } from "./overlay-types";

export async function poolFeed(stage: PoolStage | undefined): Promise<{ pool: FeedMap[]; groups?: FeedGroup[] }> {
  if (!stage?.released) return { pool: [] };
  const pool: FeedMap[] = stage.pools.flatMap((p) => p.maps).map((map) => ({
    slot: map.slot,
    mod: map.mod,
    id: map.id,
    title: map.title,
    version: map.version,
    creator: map.creator,
    sr: map.sr,
    bpm: map.bpm,
    length: map.length,
    cs: map.cs,
    ar: map.ar,
    od: map.od,
    cover: map.cover,
  }));
  const layout = (await getSkillLayouts())?.[stage.slug];
  if (!layout) return { pool };
  const groups = bySkill(stage, layout).pools.map((p) => ({ name: p.category, color: (p as { color?: string }).color ?? "var(--color-paper)", slots: p.maps.map((m) => m.slot) }));
  return { pool, groups };
}

export async function resolveOverlay(key: string): Promise<{ found: boolean; matchId: string | null }> {
  const k = key.toLowerCase();
  const f = getFormat();
  const id = matchIdFromSlug(f, k);

  if (id) {
    const m = (await getAllMatches()).some((m) => m.id === id);
    if (m) {
      return { found: true, matchId: id };
    }
  }

  const u = await overlayUser(k);
  if (!u) {
    return { found: false, matchId: null };
  }

  const m = await currentStreamMatch(u.osuId);
  return { found: true, matchId: m?.id ?? null };
}

export async function buildFeed(matchId: string): Promise<OverlayFeed | null> {
  const f = getFormat();
  const [allMatches, allTeams, draft, stages, sceneRow] = await Promise.all([
    getAllMatches(),
    getAllTeams(),
    settle(matchId),
    getPoolStages(),
    db.select({ scene: matches.scene }).from(matches).where(eq(matches.id, matchId)).limit(1),
  ]);

  const m = allMatches.find((m) => m.id === matchId);
  if (!m) {
    return null;
  }

  const team = (side: { id: string; name: string }): FeedTeam => {
    const t = allTeams.find((t) => t.id === side.id);
    if (t) {
      return {
        id: t.id,
        name: t.name,
        image: t.image,
        players: t.players.map((p) => ({
          id: p.userId,
          name: p.username,
          avatar: p.avatar,
        })),
      };
    }
    return {
      id: side.id ?? "",
      name: side.name,
      image: "",
      players: [],
    };
  };

  const stageSlug = draft?.stageSlug ?? m.stage;
  const stage = stages.find((s) => s.slug === stageSlug);
  const { pool, groups } = await poolFeed(stage);

  const firstTo = draft?.firstTo ?? stage?.firstTo ?? f.firstTo;

  const live = getLive(matchId);
  const playing = currentEdition() === siteEdition() ? nowPlaying(matchId) : null;
  const inPlay = live ? live.ipcState === IPC_PLAYING : !!playing;

  const steps: FeedStep[] = (draft?.steps ?? [])
    .filter((s) => !s.skip)
    .map((s) => ({
      team: s.team,
      kind: s.kind,
      slot: s.slot,
      winner: s.winner ?? null,
    }));

  if (inPlay) {
    const lastPick = [...steps].reverse().findIndex((s) => s.kind === "pick");
    if (lastPick !== -1) {
      const lastPickIndex = steps.length - 1 - lastPick;
      steps[lastPickIndex] = { ...steps[lastPickIndex], winner: null };
    }
  }

  const score: [number, number] = draft
    ? [
        steps.filter((s) => s.kind === "pick" && s.winner === 1).length,
        steps.filter((s) => s.kind === "pick" && s.winner === 2).length,
      ]
    : [m.team1.score ?? 0, m.team2.score ?? 0];

  const winner = inPlay ? null : m.winner ?? null;

  const mapId = live?.mapId || playing?.mapId || 0;
  const lastPick = [...steps].reverse().find((s) => s.kind === "pick" && s.winner === null);
  const current =
    pool.find((x) => x.id === mapId) ?? (lastPick ? pool.find((x) => x.slot === lastPick.slot) : undefined) ?? null;

  const auto: Scene = winner !== null ? "winner" : inPlay ? "gameplay" : draft?.open ? draft.roll1 == null || draft.roll2 == null ? "intro" : "mappool" : "soon";

  const o = sceneRow[0]?.scene;
  const scene: Scene = isScene(o) ? o : auto;
  const sceneAuto = !isScene(o);

  return {
    edition: f.edition,
    tournament: f.name,
    match: {
      id: m.id,
      slug: matchSlug(f, m.id),
      round: m.round,
      startsAt: m.datetime,
      firstTo,
      score,
      winner,
      streamer: m.streamer,
      commentators: m.commentators,
    },
    teams: [team(m.team1), team(m.team2)],
    pool,
    groups,
    steps: stage?.released ? steps : [],
    current,
    live: stage?.released ? live : null,
    scene,
    sceneAuto,
    at: Date.now(),
  };
}
