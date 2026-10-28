import "server-only";
import { eq } from "drizzle-orm";
import { currentEdition, db, siteEdition } from "@/db";
import { matches } from "@/db/schema";
import { getAllMatches, getAllTeams } from "@/db/tournament";
import { matchIdFromSlug, matchSlug } from "@/lib/format";
import { getDraft, settle } from "@/db/drafts";
import { getFormat } from "@/db/edition";
import { getPoolStages, type PoolStage } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";
import { nowPlaying } from "@/lib/bancho";
import { getLive, IPC_PLAYING } from "@/lib/live-scores";
import { overlayUser, currentStreamMatch } from "@/db/stream";
import { isScene, type Scene } from "@/lib/scenes";
import { getCue, PLAY_LEAD } from "@/lib/overlay-cues";
import type { OverlayFeed, FeedTeam, FeedMap, FeedStep, FeedGroup, FeedMatch, LiveScore } from "./overlay-types";
import { TEST_MATCH } from "@/lib/format";

const BUILD = String(Date.now());

// feeds rebuild several times a second; the draft timer check (which can write) only needs ~1/s
const gs = globalThis as unknown as { bgccSettledAt?: Map<string, number> };
function settleSometimes(matchId: string) {
  const m = (gs.bgccSettledAt ??= new Map());
  if (Date.now() - (m.get(matchId) ?? 0) < 1000) return getDraft(matchId);
  m.set(matchId, Date.now());
  return settle(matchId);
}

// after the roll winner chooses pick/ban the intro stays up this long, then the pool
const CHOICE_HOLD = 20_000;
// final scores stay on the gameplay scene this long after a map ends
const RESULTS_HOLD = 20_000;
const ABORT_HOLD = 5_000;
const gl = globalThis as unknown as { bgccLastLive?: Map<string, LiveScore> };
const lastLive = () => (gl.bgccLastLive ??= new Map());
const gr = globalThis as unknown as { bgccRolledAt?: Map<string, { key: string; at: number }> };
function rolledSince(matchId: string, key: string, fallback: number) {
  const m = (gr.bgccRolledAt ??= new Map());
  const hit = m.get(matchId);
  if (hit?.key === key) return hit.at;
  const at = hit ? Date.now() : fallback;
  m.set(matchId, { key, at });
  return at;
}

export async function scheduleFeed(): Promise<FeedMatch[]> {
  return (await getAllMatches())
    .filter((m) => m.id !== TEST_MATCH.id)
    .map((m) => ({
      id: m.id,
      round: m.round,
      bracket: m.bracket,
      startsAt: m.datetime,
      teams: [m.team1.name, m.team2.name],
      score: [m.team1.score, m.team2.score],
      winner: m.winner ?? null,
    }));
}

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
  const groups = bySkill(stage, layout).pools.map((p) => ({ name: p.category, color: (p as { color?: string }).color ?? "var(--paper)", slots: p.maps.map((m) => m.slot) }));
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
    settleSometimes(matchId),
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
          rank: p.rank || null,
          country: p.country,
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
  const mapId = live?.mapId || playing?.mapId || 0;

  const steps: FeedStep[] = (draft?.steps ?? [])
    .filter((s) => !s.skip)
    .map((s) => ({
      team: s.team,
      kind: s.kind,
      slot: s.slot,
      winner: s.winner ?? null,
    }));

  // hide the result of the map being played until play ends, but only if the last pick is that map
  if (inPlay) {
    const lastPick = [...steps].reverse().findIndex((s) => s.kind === "pick");
    if (lastPick !== -1) {
      const lastPickIndex = steps.length - 1 - lastPick;
      const pickMap = pool.find((x) => x.slot === steps[lastPickIndex].slot)?.id;
      if (!mapId || !pickMap || pickMap === mapId) steps[lastPickIndex] = { ...steps[lastPickIndex], winner: null };
    }
  }

  const score: [number, number] = draft
    ? [
        steps.filter((s) => s.kind === "pick" && s.winner === 1).length,
        steps.filter((s) => s.kind === "pick" && s.winner === 2).length,
      ]
    : [m.team1.score ?? 0, m.team2.score ?? 0];

  const winner = inPlay ? null : m.winner ?? null;

  const lastPick = [...steps].reverse().find((s) => s.kind === "pick" && s.winner === null);
  const current =
    pool.find((x) => x.id === mapId) ?? (lastPick ? pool.find((x) => x.slot === lastPick.slot) : undefined) ?? null;

  const now = Date.now();
  const rolled = draft?.roll1 != null && draft?.roll2 != null && draft.roll1 !== draft.roll2;
  const chosenAt = rolled && draft.choice ? rolledSince(matchId, `${draft.roll1}:${draft.roll2}:${draft.choice}`, draft.steps.length ? 0 : Date.parse(draft.turnAt ?? "") || now) : null;
  if (rolled && !draft.choice) rolledSince(matchId, `${draft.roll1}:${draft.roll2}`, now);
  // the intro waits for the roll winner's pick/ban choice, holds a bit, then the pool
  const introDone = (chosenAt !== null && now - chosenAt >= CHOICE_HOLD) || !!draft?.steps.length;

  const cue = currentEdition() === siteEdition() ? getCue(matchId) : null;
  if (live && live.ipcState === IPC_PLAYING) lastLive().set(matchId, live);
  const results = cue?.finishedAt != null && now - cue.finishedAt < RESULTS_HOLD;
  const aborted = !!cue?.abortHold && cue.abortAt != null && now - cue.abortAt < ABORT_HOLD;
  // !mp start N: the gameplay scene comes up PLAY_LEAD before the countdown ends
  const countingIn = cue?.countdownEnd != null && now >= cue.countdownEnd - PLAY_LEAD && now < cue.countdownEnd + 30_000;
  const held = results && !inPlay ? lastLive().get(matchId) : undefined;
  const shownLive = held ? { ...held, at: now } : live;
  const auto: Scene = inPlay || countingIn || results || aborted ? "gameplay" : winner !== null ? "winner" : draft?.open ? (introDone ? "mappool" : "intro") : "soon";

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
    schedule: await scheduleFeed(),
    steps: stage?.released ? steps : [],
    rolls: [draft?.roll1 ?? null, draft?.roll2 ?? null],
    choice: draft?.choice === "pick" || draft?.choice === "ban" ? draft.choice : null,
    current,
    live: stage?.released ? shownLive : null,
    scene,
    sceneAuto,
    at: Date.now(),
    build: BUILD,
  };
}
