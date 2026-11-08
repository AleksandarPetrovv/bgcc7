import "server-only";
import { eq } from "drizzle-orm";
import { currentEdition, db, editionKey, siteEdition } from "@/db";
import { matches } from "@/db/schema";
import { getAllMatches, getAllTeams } from "@/db/tournament";
import { matchIdFromSlug } from "@/lib/format";
import { getDraft, settle } from "@/db/drafts";
import { getFormat } from "@/db/edition";
import { firstToOf, getPoolStages, type PoolStage } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";
import { nowPlaying } from "@/lib/bancho";
import { getLive } from "@/lib/live-scores";
import { IPC_PLAYING } from "@/lib/relay-contract";
import { overlayUser, currentStreamMatch } from "@/db/stream";
import { isScene, type Scene } from "@/lib/scenes";
import { getCue, PLAY_LEAD } from "@/lib/overlay-cues";
import type { OverlayFeed, FeedTeam, FeedMap, FeedStep, FeedGroup, FeedMatch, FeedTurn, LiveScore } from "./overlay-types";
import { scoreOf, tbDue, turnOf, type DraftView } from "@/lib/draft";
import { TEST_MATCH } from "@/lib/format";
import { canSee } from "@/lib/authz";
import { globalStore } from "@/lib/global-store";
import { BUILD } from "@/lib/build";

// feeds rebuild several times a second; the draft timer check (which can write) only needs ~1/s
const settledAt = globalStore("bgccSettledAt", () => new Map<string, number>());
function settleSometimes(matchId: string) {
  const k = editionKey(matchId);
  if (Date.now() - (settledAt.get(k) ?? 0) < 1000) return getDraft(matchId);
  settledAt.set(k, Date.now());
  return settle(matchId);
}

const CHOICE_HOLD = 20_000;
const RESULTS_HOLD = 15_000;
// on auto, after the last map: the winner, then the bracket playing the result, then "thanks for watching"
const WINNER_HOLD = 30_000;
const BRACKET_HOLD = 30_000;
const ABORT_HOLD = 5_000;
const lastLive = globalStore("bgccLastLive", () => new Map<string, LiveScore>());
// when a match's value (its rolls, its result) last changed; `fallback` the first time it is seen
function sinceStore(name: string) {
  const seen = globalStore(name, () => new Map<string, { key: string; at: number }>());
  return (matchId: string, key: string, fallback: number) => {
    const hit = seen.get(editionKey(matchId));
    if (hit?.key === key) return hit.at;
    const at = hit ? Date.now() : fallback;
    seen.set(editionKey(matchId), { key, at });
    return at;
  };
}
const rolledSince = sinceStore("bgccRolledAt");
const wonSince = sinceStore("bgccWonAt");

export async function scheduleFeed(): Promise<FeedMatch[]> {
  if (!(await canSee("schedule"))) return [];
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

function feedTurn(draft: DraftView | null | undefined, pool: FeedMap[]): FeedTurn {
  if (!draft?.open) return null;
  if (tbDue(draft)) return { kind: "tb" };
  const t = turnOf(draft, pool.map((p) => p.slot));
  return t.kind === "pick" || t.kind === "ban" ? { kind: t.kind, team: t.team } : null;
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

  const firstTo = draft?.firstTo ?? firstToOf(stages, stageSlug);

  const live = getLive(matchId);
  const playing = nowPlaying(matchId);
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

  const score: [number, number] = draft ? scoreOf(draft) : [m.team1.score ?? 0, m.team2.score ?? 0];

  const winner = inPlay ? null : m.winner ?? null;

  const lastPick = [...steps].reverse().find((s) => s.kind === "pick" && s.winner === null);
  const current =
    pool.find((x) => x.id === mapId) ?? (lastPick ? pool.find((x) => x.slot === lastPick.slot) : undefined) ?? null;

  const now = Date.now();
  const rolled = draft?.roll1 != null && draft?.roll2 != null && draft.roll1 !== draft.roll2;
  const chosenAt = rolled && draft.choice ? rolledSince(matchId, `${draft.roll1}:${draft.roll2}:${draft.choice}`, draft.steps.length ? 0 : Date.parse(draft.turnAt ?? "") || now) : null;
  if (rolled && !draft.choice) rolledSince(matchId, `${draft.roll1}:${draft.roll2}`, now);
  const introDone = (chosenAt !== null && now - chosenAt >= CHOICE_HOLD) || !!draft?.steps.length;

  const cue = currentEdition() === siteEdition() ? getCue(matchId) : null;
  if (live && live.ipcState === IPC_PLAYING) lastLive.set(editionKey(matchId), live);
  const results = cue?.finishedAt != null && now - cue.finishedAt < RESULTS_HOLD;
  const aborted = !!cue?.abortHold && cue.abortAt != null && now - cue.abortAt < ABORT_HOLD;
  // !mp start N: the gameplay scene comes up PLAY_LEAD before the countdown ends
  const countingIn = cue?.countdownEnd != null && now >= cue.countdownEnd - PLAY_LEAD && now < cue.countdownEnd + 30_000;
  const held = results && !inPlay ? lastLive.get(editionKey(matchId)) : undefined;
  const shownLive = held ? { ...held, at: now } : live;
  // the result counts from when the last map's results stop showing (or when it is first seen, for a score typed in by hand)
  const wonFor = winner === null ? 0 : now - wonSince(matchId, `${winner}:${score}`, cue?.finishedAt != null ? cue.finishedAt + RESULTS_HOLD : now);
  const done: Scene = wonFor < WINNER_HOLD ? "winner" : wonFor < WINNER_HOLD + BRACKET_HOLD ? "bracket" : "end";
  const auto: Scene = inPlay || countingIn || results || aborted ? "gameplay" : winner !== null ? done : draft?.open ? (introDone ? "mappool" : "intro") : "soon";

  const o = sceneRow[0]?.scene;
  const scene: Scene = isScene(o) ? o : auto;
  const sceneAuto = !isScene(o);

  return {
    edition: f.edition,
    tournament: f.name,
    match: {
      id: m.id,
      slug: m.id,
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
    turn: stage?.released ? feedTurn(draft, pool) : null,
    current,
    live: stage?.released ? shownLive : null,
    scene,
    sceneAuto,
    at: Date.now(),
    build: BUILD,
  };
}
