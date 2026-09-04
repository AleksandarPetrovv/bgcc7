import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { matchCache, scoreEdits } from "./schema";
import { finishMatch } from "./bracket";
import type { PoolStage } from "./mappools";
import type { Match, Team } from "@/lib/data";
import { buildScoreboard, playoffPools, SCOREBOARD_V, type ScoreEdit, type Scoreboard } from "@/lib/scoreboard";
import { isLive } from "@/lib/matches";
import { getSettings } from "./settings";

const LIVE_TTL = 30_000;
const live = new Map<string, { at: number; data: Scoreboard }>();

async function stored(id: string, links: string, ez: number) {
  try {
    const [row] = await db.select().from(matchCache).where(eq(matchCache.matchId, id)).limit(1);
    return row && row.links === links && (row.data as Scoreboard).v === SCOREBOARD_V && (row.data as Scoreboard).ez === ez ? (row.data as Scoreboard) : null;
  } catch (e) {
    console.error("[match cache]", e);
    return null;
  }
}

export async function getEdits(matchId: string): Promise<ScoreEdit[]> {
  try {
    const rows = await db.select().from(scoreEdits).where(eq(scoreEdits.matchId, matchId));
    return rows.map((r) => ({ gameId: r.gameId, osuId: r.osuId, team: r.team === 2 ? 2 : 1, score: r.score, acc: r.acc, mods: r.mods ? r.mods.split(",") : [], removed: r.removed }));
  } catch (e) {
    console.error("[score edits]", e);
    return [];
  }
}

export async function forgetScoreboard(matchId: string) {
  live.delete(matchId);
  await db.delete(matchCache).where(eq(matchCache.matchId, matchId));
}

export async function getScoreboard(match: Match, teams: Team[], stages: PoolStage[]): Promise<Scoreboard | null> {
  if (!match.links.length) return null;
  const links = match.links.join(",");
  const { ezMult } = await getSettings();
  const saved = await stored(match.id, links, ezMult);
  if (saved) return saved;

  const hit = live.get(match.id);
  if (hit && hit.data.ez === ezMult && Date.now() - hit.at < LIVE_TTL) return hit.data;

  const firstTo = stages.find((s) => s.slug === match.stage)?.firstTo ?? 7;
  try {
    const data = await buildScoreboard(match, teams, playoffPools(stages), await getEdits(match.id), ezMult);
    if (Math.max(...data.score) >= firstTo) {
      await db
        .insert(matchCache)
        .values({ matchId: match.id, links, data })
        .onConflictDoUpdate({ target: matchCache.matchId, set: { links, data, createdAt: new Date() } })
        .catch((e) => console.error("[match cache]", e));
      live.delete(match.id);
      if (!match.winner) await finishMatch(match.id, data.score).catch((e) => console.error("[match finish]", e));
    } else live.set(match.id, { at: Date.now(), data });
    return data;
  } catch (e) {
    console.error("[match]", match.id, e);
    return hit?.data ?? null;
  }
}

export async function getLiveScores(matches: Match[], teams: Team[], stages: PoolStage[]) {
  const liveOnes = matches.filter(isLive);
  const out: Record<string, [number, number] | null> = {};
  await Promise.all(
    liveOnes.map(async (m) => {
      const timeout = new Promise<null>((r) => setTimeout(() => r(null), 4000));
      const sb = await Promise.race([getScoreboard(m, teams, stages), timeout]);
      out[m.id] = sb ? sb.score : null;
    }),
  );
  return out;
}
