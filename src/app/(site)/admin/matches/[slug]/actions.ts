"use server";

import { db } from "@/db";
import { and, eq } from "drizzle-orm";

import { scoreEdits } from "@/db/schema";
import { refinishFromScoreboard } from "@/db/match";
import { forgetScoreboard } from "@/db/scoreboards";
import { getMatches, getTeams } from "@/db/tournament";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";

const parseMods = (v: string) => (v.toUpperCase().replace(/[^A-Z]/g, "").match(/.{2}/g) ?? []).filter((m) => m !== "NM").join(",");

async function sync(matchId: string) {
  const r = await refinishFromScoreboard(matchId);
  if (r === "failed") throw new Error("saving the result failed");
  if (r === "partial") await forgetScoreboard(matchId);
}

async function upsertScore(values: typeof scoreEdits.$inferInsert) {
  await db
    .insert(scoreEdits)
    .values(values)
    .onConflictDoUpdate({ target: [scoreEdits.matchId, scoreEdits.gameId, scoreEdits.osuId], set: values });
}

async function rosterTeam(matchId: string, osuId: number) {
  const [all, teams] = await Promise.all([getMatches(), getTeams()]);
  const m = all.find((x) => x.id === matchId);
  if (!m) return null;
  const on = (id: string) => teams.find((t) => t.id === id)?.players.some((p) => p.userId === osuId);
  return on(m.team1.id) ? 1 : on(m.team2.id) ? 2 : null;
}

export async function saveScore(matchId: string, gameId: number, fixedOsuId: number | null, _: ActionResult, fd: FormData) {
  return guard("matches", "match.score.save", async ({ osuId: by }) => {
    const osuId = fixedOsuId ?? Number(fd.get("osuId"));
    const score = Math.round(Number(String(fd.get("score") ?? "").replace(/[\s,.]/g, "")));
    const accIn = Number(String(fd.get("acc") ?? "").replace(",", "."));
    if (!Number.isInteger(osuId) || osuId <= 0 || !Number.isInteger(score) || score < 0 || score > 100_000_000) return { ok: false, error: "invalid" };
    if (!Number.isFinite(accIn) || accIn < 0 || accIn > 100) return { ok: false, error: "invalid" };
    const team = await rosterTeam(matchId, osuId);
    if (!team) return { ok: false, error: "invalid" };
    const values = { matchId, gameId, osuId, team, score, acc: accIn / 100, mods: parseMods(String(fd.get("mods") ?? "")), removed: false, editedBy: by, editedAt: new Date() };
    await upsertScore(values);
    await sync(matchId);
    return { log: { matchId, gameId, osuId, score, acc: accIn } };
  }, { match: matchId });
}

export async function removeScore(matchId: string, gameId: number, osuId: number) {
  return guard("matches", "match.score.remove", async ({ osuId: by }) => {
    if (!Number.isInteger(osuId) || osuId <= 0 || !Number.isInteger(gameId)) return { ok: false, error: "invalid" };
    const team = await rosterTeam(matchId, osuId);
    if (!team) return { ok: false, error: "invalid" };
    await upsertScore({ matchId, gameId, osuId, team, score: 0, acc: 0, mods: "", removed: true, editedBy: by, editedAt: new Date() });
    await sync(matchId);
    return { log: { matchId, gameId, osuId } };
  }, { match: matchId });
}

export async function undoScore(matchId: string, gameId: number, osuId: number) {
  return guard("matches", "match.score.undo", async () => {
    await db.delete(scoreEdits).where(and(eq(scoreEdits.matchId, matchId), eq(scoreEdits.gameId, gameId), eq(scoreEdits.osuId, osuId)));
    await sync(matchId);
    return { log: { matchId, gameId, osuId } };
  }, { match: matchId });
}
