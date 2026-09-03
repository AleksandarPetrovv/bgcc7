"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { matches, teamMembers, teams } from "@/db/schema";
import { getQualResults } from "@/db/qualifiers";
import { getSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";

const newId = () => `team_${crypto.randomUUID().slice(0, 8)}`;

export async function generateTeams() {
  return guard("teams", "teams.generate", async () => {
    const [{ players }, settings] = await Promise.all([getQualResults(), getSettings()]);
    const size = Math.floor(settings.qualifyCount / 3);
    const top = players.slice(0, size * 3);
    if (top.length < 6) return { ok: false, error: "invalid" };
    const n = Math.floor(top.length / 3);
    await db.transaction(async (tx) => {
      await tx.update(matches).set({ team1Id: null, team2Id: null, score1: null, score2: null, winner: null, manual: false });
      await tx.delete(teams);
      for (let k = 0; k < n; k++) {
        const picks = [top[k], top[2 * n - 1 - k], top[2 * n + k]].filter(Boolean);
        const id = newId();
        await tx.insert(teams).values({ id, name: `Team ${picks[0].username}`, seed: k + 1 });
        for (const [i, p] of picks.entries()) await tx.insert(teamMembers).values({ osuId: p.id, teamId: id, isCaptain: i === 0 });
      }
    });
    return { teams: n };
  });
}

export async function createTeam(_: ActionResult, fd: FormData) {
  return guard("teams", "team.create", async () => {
    const name = String(fd.get("name") ?? "").trim().slice(0, 40);
    if (!name) return { ok: false, error: "invalid" };
    const all = await db.select({ seed: teams.seed }).from(teams);
    const id = newId();
    await db.insert(teams).values({ id, name, seed: all.length + 1 });
    return { id, name };
  });
}

export async function updateTeam(id: string, _: ActionResult, fd: FormData) {
  return guard("teams", "team.update", async () => {
    const name = String(fd.get("name") ?? "").trim().slice(0, 40);
    const image = String(fd.get("image") ?? "").trim().slice(0, 500);
    if (!name || (image && !/^https:\/\//.test(image))) return { ok: false, error: "invalid" };
    const captain = Number(fd.get("captain"));
    await db.update(teams).set({ name, image }).where(eq(teams.id, id));
    if (Number.isInteger(captain) && captain > 0) {
      await db.update(teamMembers).set({ isCaptain: false }).where(and(eq(teamMembers.teamId, id), ne(teamMembers.osuId, captain)));
      await db.update(teamMembers).set({ isCaptain: true }).where(and(eq(teamMembers.teamId, id), eq(teamMembers.osuId, captain)));
    }
    return { id, name, image, captain };
  });
}

export async function deleteTeam(id: string) {
  return guard("teams", "team.delete", async () => {
    const [row] = await db.delete(teams).where(eq(teams.id, id)).returning({ name: teams.name });
    return { id, name: row?.name ?? null };
  });
}

export async function placeMember(_: ActionResult, fd: FormData) {
  return guard("teams", "team.placeMember", async () => {
    const osuId = Number(fd.get("osuId"));
    const teamId = String(fd.get("teamId") ?? "");
    if (!Number.isInteger(osuId) || !teamId) return { ok: false, error: "invalid" };
    await db
      .insert(teamMembers)
      .values({ osuId, teamId, isCaptain: false })
      .onConflictDoUpdate({ target: teamMembers.osuId, set: { teamId, isCaptain: false } });
    return { osuId, teamId };
  });
}

export async function removeMember(osuId: number) {
  return guard("teams", "team.removeMember", async () => {
    await db.delete(teamMembers).where(eq(teamMembers.osuId, osuId));
    return { osuId };
  });
}
