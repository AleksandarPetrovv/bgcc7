"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { matches, teamMembers, teams, users } from "@/db/schema";
import { getFormat } from "@/db/edition";
import { newTeamId, seedBracket } from "@/db/draw";
import { getQualResults } from "@/db/qualifiers";
import { getSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";

const newId = newTeamId;

export async function generateTeams() {
  return guard("teams", "teams.generate", async () => {
    if ((await getFormat()).edition !== "bgcc6") return { ok: false, error: "invalid" };
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
    await db.insert(teams).values({ id, name, seed: Math.max(all.length, ...all.map((t) => t.seed)) + 1 });
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
    const row = await db.transaction(async (tx) => {
      const [gone] = await tx.delete(teams).where(eq(teams.id, id)).returning({ name: teams.name });
      const left = await tx.select({ id: teams.id }).from(teams).orderBy(asc(teams.seed), asc(teams.name));
      for (const [k, t] of left.entries()) await tx.update(teams).set({ seed: k + 1 }).where(eq(teams.id, t.id));
      return gone;
    });
    return { id, name: row?.name ?? null };
  });
}

export async function placeMember(_: ActionResult, fd: FormData) {
  return guard("teams", "team.placeMember", async () => {
    const osuId = Number(fd.get("osuId"));
    const teamId = String(fd.get("teamId") ?? "");
    if (!Number.isInteger(osuId) || !teamId) return { ok: false, error: "invalid" };
    const [old] = await db.select().from(teamMembers).where(eq(teamMembers.osuId, osuId)).limit(1);
    const mates = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    const lead = !mates.some((m) => m.isCaptain && m.osuId !== osuId);
    await db
      .insert(teamMembers)
      .values({ osuId, teamId, isCaptain: lead })
      .onConflictDoUpdate({ target: teamMembers.osuId, set: { teamId, isCaptain: lead } });
    if (old?.isCaptain && old.teamId !== teamId) await promote(old.teamId);
    return { osuId, teamId };
  });
}

async function promote(teamId: string, heir?: number) {
  const rest = await db
    .select({ osuId: teamMembers.osuId, isCaptain: teamMembers.isCaptain, pp: users.pp })
    .from(teamMembers)
    .innerJoin(users, eq(users.osuId, teamMembers.osuId))
    .where(eq(teamMembers.teamId, teamId));
  if (!rest.length || rest.some((m) => m.isCaptain)) return;
  const pick = rest.find((m) => m.osuId === heir) ?? [...rest].sort((a, b) => (b.pp ?? 0) - (a.pp ?? 0))[0];
  await db.update(teamMembers).set({ isCaptain: true }).where(eq(teamMembers.osuId, pick.osuId));
}

export async function removeMember(osuId: number, heir?: number) {
  return guard("teams", "team.removeMember", async () => {
    const [row] = await db.delete(teamMembers).where(eq(teamMembers.osuId, osuId)).returning();
    if (row?.isCaptain) await promote(row.teamId, heir);
    return { osuId, heir: row?.isCaptain ? (heir ?? null) : undefined };
  });
}

export async function seedTeams() {
  return guard("teams", "teams.seed", async () => {
    const teams = await seedBracket();
    return teams ? { teams } : { ok: false, error: "invalid" };
  });
}

export async function setBadges(osuId: number, _: ActionResult, fd: FormData) {
  return guard("teams", "teams.badges", async () => {
    const raw = String(fd.get("badges") ?? "").trim();
    const n = raw === "" ? null : Number(raw);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) return { ok: false, error: "invalid" };
    await db.update(users).set({ badgeOverride: n }).where(eq(users.osuId, osuId));
    return { osuId, badges: n };
  });
}
