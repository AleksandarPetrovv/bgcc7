import { db } from "./index";
import "server-only";
import { eq } from "drizzle-orm";
import { getEdition, getFormat } from "./edition";
import { matchCache, scoreEdits } from "./schema";
import { finishMatch } from "./bracket";
import type { PoolStage } from "./mappools";
import type { Match, Team } from "@/lib/data";
import { buildScoreboard, playoffPools, SCOREBOARD_V, type ScoreEdit, type Scoreboard } from "@/lib/scoreboard";
import { isLive } from "@/lib/matches";
import { alertId, clear, describeMatch, failingFor, osuIdOf, raise } from "@/lib/alerts";

const LIVE_TTL = 30_000;
const live = new Map<string, { at: number; data: Scoreboard }>();

async function stored(id: string, links: string) {
  try {
    const [row] = await db.select().from(matchCache).where(eq(matchCache.matchId, id)).limit(1);
    return row && row.links === links && (row.data as Scoreboard).v === SCOREBOARD_V ? (row.data as Scoreboard) : null;
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
  live.delete(`${await getEdition()}:${matchId}`);
  await db.delete(matchCache).where(eq(matchCache.matchId, matchId));
}

/** saves the result once the match is decided; on failure the match stays unfinished and an alert asks to retry */
export async function settleFinish(match: Pick<Match, "id" | "referee">, score: [number, number]) {
  const id = alertId("finishFailed", match.id);
  try {
    await finishMatch(match.id, score);
    clear(id);
    return true;
  } catch (e) {
    console.error("[match finish]", match.id, e);
    const info = await describeMatch(match.id);
    raise({ id, kind: "finishFailed", level: "red", match: info, href: `/admin/matches/${info.slug}`, detail: e instanceof Error ? e.message : String(e) }, { hosts: true, osuIds: [await osuIdOf(match.referee)] });
    return false;
  }
}

const STALE_AFTER = 2 * 60_000;

export async function getScoreboard(match: Match, teams: Team[], stages: PoolStage[]): Promise<Scoreboard | null> {
  if (!match.links.length) return null;
  const links = match.links.join(",");
  const firstTo = stages.find((s) => s.slug === match.stage)?.firstTo ?? getFormat().firstTo;
  const decided = (score: [number, number]) => Math.max(...score) >= firstTo;
  const saved = await stored(match.id, links);
  if (saved) {
    // a cached result whose finish never got saved: finish it now instead of serving it forever
    if (!match.winner && decided(saved.score)) await settleFinish(match, saved.score);
    return saved;
  }

  const key = `${await getEdition()}:${match.id}`;
  const hit = live.get(key);
  if (hit && Date.now() - hit.at < LIVE_TTL) return hit.data;

  const staleId = alertId("scoresStale", match.id);
  try {
    const data = await buildScoreboard(match, teams, playoffPools(stages), await getEdits(match.id));
    clear(staleId);
    if (decided(data.score) || match.winner) {
      if (!match.winner && !(await settleFinish(match, data.score))) {
        live.set(key, { at: Date.now(), data });
        return data;
      }
      await db
        .insert(matchCache)
        .values({ matchId: match.id, links, data })
        .onConflictDoUpdate({ target: matchCache.matchId, set: { links, data, createdAt: new Date() } })
        .catch((e) => console.error("[match cache]", e));
      live.delete(key);
    } else live.set(key, { at: Date.now(), data });
    return data;
  } catch (e) {
    console.error("[match]", match.id, e);
    if (isLive(match) && failingFor(staleId, STALE_AFTER)) {
      const info = await describeMatch(match.id);
      raise({ id: staleId, kind: "scoresStale", level: "gold", match: info, href: `/admin/matches/${info.slug}`, detail: e instanceof Error ? e.message : String(e) }, { hosts: true, osuIds: [await osuIdOf(match.referee)] });
    }
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
