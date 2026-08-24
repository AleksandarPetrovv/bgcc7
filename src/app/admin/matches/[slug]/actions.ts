"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, scoreEdits } from "@/db/schema";
import { advance } from "@/db/bracket";
import { getPoolStages } from "@/db/mappools";
import { forgetScoreboard, getScoreboard } from "@/db/scoreboards";
import { getMatches, getTeams } from "@/db/tournament";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";

const parseMods = (v: string) => (v.toUpperCase().replace(/[^A-Z]/g, "").match(/.{2}/g) ?? []).filter((m) => m !== "NM").join(",");

async function sync(matchId: string) {
  await forgetScoreboard(matchId);
  const [all, teams, stages] = await Promise.all([getMatches(), getTeams(), getPoolStages()]);
  const match = all.find((m) => m.id === matchId);
  if (!match) return;
  const sb = await getScoreboard(match, teams, stages);
  if (!sb) return;
  const firstTo = stages.find((s) => s.slug === match.stage)?.firstTo ?? 7;
  const [row] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!row) return;
  const [a, b] = sb.score;
  const winner = a >= firstTo && a > b ? 1 : b >= firstTo && b > a ? 2 : null;
  if (row.score1 === a && row.score2 === b && row.winner === winner) return;
  await db.update(matches).set({ score1: a, score2: b, winner }).where(eq(matches.id, matchId));
  await advance();
}

async function rosterTeam(matchId: string, osuId: number) {
  const [all, teams] = await Promise.all([getMatches(), getTeams()]);
  const m = all.find((x) => x.id === matchId);
  if (!m) return null;
  const on = (id: string) => teams.find((t) => t.id === id)?.players.some((p) => p.userId === osuId);
  return on(m.team1.id) ? 1 : on(m.team2.id) ? 2 : null;
}

export async function saveScore(matchId: string, gameId: number, fixedOsuId: number | null, _: ActionResult, fd: FormData) {
  return guard("matches", "match.score.save", async (by) => {
    const osuId = fixedOsuId ?? Number(fd.get("osuId"));
    const score = Math.round(Number(String(fd.get("score") ?? "").replace(/[\s,.]/g, "")));
    const accIn = Number(String(fd.get("acc") ?? "").replace(",", "."));
    if (!Number.isInteger(osuId) || osuId <= 0 || !Number.isInteger(score) || score < 0 || score > 100_000_000) return { ok: false, error: "invalid" };
    if (!Number.isFinite(accIn) || accIn < 0 || accIn > 100) return { ok: false, error: "invalid" };
    const team = await rosterTeam(matchId, osuId);
    if (!team) return { ok: false, error: "invalid" };
    const values = { matchId, gameId, osuId, team, score, acc: accIn / 100, mods: parseMods(String(fd.get("mods") ?? "")), removed: false, editedBy: by, editedAt: new Date() };
    await db
      .insert(scoreEdits)
      .values(values)
      .onConflictDoUpdate({ target: [scoreEdits.matchId, scoreEdits.gameId, scoreEdits.osuId], set: values });
    await sync(matchId);
    return { matchId, gameId, osuId, score, acc: accIn };
  });
}

export async function removeScore(matchId: string, gameId: number, osuId: number, team: 1 | 2) {
  return guard("matches", "match.score.remove", async (by) => {
    const values = { matchId, gameId, osuId, team, score: 0, acc: 0, mods: "", removed: true, editedBy: by, editedAt: new Date() };
    await db
      .insert(scoreEdits)
      .values(values)
      .onConflictDoUpdate({ target: [scoreEdits.matchId, scoreEdits.gameId, scoreEdits.osuId], set: values });
    await sync(matchId);
    return { matchId, gameId, osuId };
  });
}

export async function undoScore(matchId: string, gameId: number, osuId: number) {
  return guard("matches", "match.score.undo", async () => {
    await db.delete(scoreEdits).where(and(eq(scoreEdits.matchId, matchId), eq(scoreEdits.gameId, gameId), eq(scoreEdits.osuId, osuId)));
    await sync(matchId);
    return { matchId, gameId, osuId };
  });
}
