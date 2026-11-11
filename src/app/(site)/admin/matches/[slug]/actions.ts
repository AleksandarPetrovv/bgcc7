"use server";

import { db, isBGCC6 } from "@/db";
import { and, eq } from "drizzle-orm";

import { scoreEdits } from "@/db/schema";
import { getPoolStages } from "@/db/mappools";
import { refinishFromScoreboard } from "@/db/refinish";
import { forgetScoreboard, getScoreboard, toEdit } from "@/db/scoreboards";
import { getMatches, getTeams } from "@/db/tournament";
import { guard } from "@/lib/admin-action";
import { multiPick, validPick } from "@/lib/mods";
import { MAX_SCORE } from "@/lib/result";
import { editsStamp } from "@/lib/scoreboard";
import { editLocked } from "./edit-lock";

/** `mods` is null when the player's mods were not touched; `side` is the row's scoreboard team (non-roster players are placed there by lobby colour) */
export type ScoreChange = { gameId: number; osuId: number; side: 1 | 2; score: number; mods: string[] | null };

async function sync(matchId: string) {
  const r = await refinishFromScoreboard(matchId);
  if (r === "failed") throw new Error("saving the result failed");
  if (r === "partial") await forgetScoreboard(matchId);
}

const wellFormed = (c: ScoreChange) =>
  Number.isInteger(c.gameId) &&
  Number.isInteger(c.osuId) &&
  c.osuId > 0 &&
  (c.side === 1 || c.side === 2) &&
  Number.isInteger(c.score) &&
  c.score >= 0 &&
  c.score <= MAX_SCORE &&
  (c.mods === null || (Array.isArray(c.mods) && c.mods.every((m) => typeof m === "string")));

// a score of 0 is "did not play": the same removed row the old Remove button wrote, so totals and match cost skip the player
export async function saveMatchScores(matchId: string, stamp: string, changes: ScoreChange[]) {
  return guard("matches", "match.score.save", async (v) => {
    const by = v.osuId;
    if (!Array.isArray(changes) || changes.length === 0 || changes.length > 500 || !changes.every(wellFormed)) return { ok: false, error: "invalid" };
    if (new Set(changes.map((c) => `${c.gameId}:${c.osuId}`)).size !== changes.length) return { ok: false, error: "invalid" };
    const [all, teams, stages] = await Promise.all([getMatches(), getTeams(), getPoolStages()]);
    const match = all.find((x) => x.id === matchId);
    const sb = match && (await getScoreboard(match, teams, stages));
    if (!match || !sb) return { ok: false, error: "invalid" };
    if (editLocked(v.roles, match.datetime)) return { ok: false, error: "forbidden" };
    const bgcc6 = isBGCC6();
    const rosterTeam = (osuId: number) => (teams.find((t) => t.id === match.team1.id)?.players.some((p) => p.userId === osuId) ? 1 : teams.find((t) => t.id === match.team2.id)?.players.some((p) => p.userId === osuId) ? 2 : null);

    const maps = new Map(sb.maps.filter((m) => !m.note).map((m) => [m.gameId, m]));
    for (const c of changes) {
      const map = maps.get(c.gameId);
      if (!map || (c.score > 0 && c.mods && !validPick(c.mods, multiPick(map.mod, bgcc6)))) return { ok: false, error: "invalid" };
    }

    const res = await db.transaction(async (tx) => {
      const rows = await tx.select().from(scoreEdits).where(eq(scoreEdits.matchId, matchId));
      if (editsStamp(rows.map(toEdit)) !== stamp) return "stale" as const;
      const writes: (typeof scoreEdits.$inferInsert)[] = [];
      for (const c of changes) {
        const prev = rows.find((r) => r.gameId === c.gameId && r.osuId === c.osuId);
        const line = maps.get(c.gameId)!.players.flat().find((p) => p.id === c.osuId);
        const roster = rosterTeam(c.osuId);
        if (!line && !prev && !roster) return "invalid" as const;
        const keep = { acc: prev?.acc ?? line?.acc ?? 0, mods: prev?.mods ?? line?.mods.join(",") ?? "" };
        writes.push({
          matchId,
          gameId: c.gameId,
          osuId: c.osuId,
          team: roster ?? c.side,
          score: c.score,
          acc: keep.acc,
          mods: c.score > 0 && c.mods ? c.mods.join(",") : keep.mods,
          removed: c.score === 0,
          editedBy: by,
          editedAt: new Date(),
        });
      }
      for (const w of writes) await tx.insert(scoreEdits).values(w).onConflictDoUpdate({ target: [scoreEdits.matchId, scoreEdits.gameId, scoreEdits.osuId], set: w });
      return "ok" as const;
    });
    if (res === "stale") return { ok: false, error: "stale" };
    if (res === "invalid") return { ok: false, error: "invalid" };
    await sync(matchId);
    return { log: { matchId, players: changes.length, maps: new Set(changes.map((c) => c.gameId)).size } };
  }, { match: matchId });
}

export async function undoScore(matchId: string, gameId: number, osuId: number) {
  return guard("matches", "match.score.undo", async (v) => {
    const match = (await getMatches()).find((x) => x.id === matchId);
    if (!match || editLocked(v.roles, match.datetime)) return { ok: false, error: "forbidden" };
    await db.delete(scoreEdits).where(and(eq(scoreEdits.matchId, matchId), eq(scoreEdits.gameId, gameId), eq(scoreEdits.osuId, osuId)));
    await sync(matchId);
    return { log: { matchId, gameId, osuId } };
  }, { match: matchId });
}
