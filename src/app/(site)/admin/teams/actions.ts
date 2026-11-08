"use server";

import { and, asc, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { matches, teamMembers, teams, users } from "@/db/schema";
import { newTeamId, seedBracket } from "@/db/draw";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";
import { isTestTeam } from "@/lib/format";
import { playedIds } from "@/db/bracket";
import { resetPickems } from "@/db/pickems";

export async function createTeam(_: ActionResult, fd: FormData) {
  return guard("teams", "team.create", async () => {
    const name = String(fd.get("name") ?? "").trim().slice(0, 40);
    if (!name) return { ok: false, error: "invalid" };
    const all = (await db.select({ id: teams.id, seed: teams.seed }).from(teams)).filter((t) => !isTestTeam(t.id));
    const id = newTeamId();
    await db.insert(teams).values({ id, name, seed: Math.max(all.length, ...all.map((t) => t.seed)) + 1 });
    await resetPickems();
    return { log: { id, name } };
  });
}

export async function updateTeam(id: string, _: ActionResult, fd: FormData) {
  return guard("teams", "team.update", async () => {
    const name = String(fd.get("name") ?? "").trim().slice(0, 40);
    const image = String(fd.get("image") ?? "").trim().slice(0, 500);
    if (!name || (image && !/^https:\/\//.test(image))) return { ok: false, error: "invalid" };
    const captain = Number(fd.get("captain"));
    const setCaptain = Number.isInteger(captain) && captain > 0;
    if (setCaptain) {
      const [member] = await db.select({ osuId: teamMembers.osuId }).from(teamMembers).where(and(eq(teamMembers.teamId, id), eq(teamMembers.osuId, captain))).limit(1);
      if (!member) return { ok: false, error: "invalid" };
    }
    await db.update(teams).set({ name, image }).where(eq(teams.id, id));
    if (setCaptain) {
      await db.transaction(async (tx) => {
        await tx.update(teamMembers).set({ isCaptain: false }).where(and(eq(teamMembers.teamId, id), ne(teamMembers.osuId, captain)));
        await tx.update(teamMembers).set({ isCaptain: true }).where(and(eq(teamMembers.teamId, id), eq(teamMembers.osuId, captain)));
      });
    }
    await resetPickems();
    return { log: { id, name, image, captain } };
  });
}

export async function deleteTeam(id: string) {
  return guard("teams", "team.delete", async () => {
    // a team that already played keeps its slot, otherwise the bracket loses results it was built on
    const [mine, played] = await Promise.all([db.select({ id: matches.id }).from(matches).where(or(eq(matches.team1Id, id), eq(matches.team2Id, id))), playedIds()]);
    if (mine.some((m) => played.has(m.id))) return { ok: false, error: "invalid" };
    const row = await db.transaction(async (tx) => {
      const [gone] = await tx.delete(teams).where(eq(teams.id, id)).returning({ name: teams.name });
      const left = (await tx.select({ id: teams.id }).from(teams).orderBy(asc(teams.seed), asc(teams.name))).filter((t) => !isTestTeam(t.id));
      for (const [k, t] of left.entries()) await tx.update(teams).set({ seed: k + 1 }).where(eq(teams.id, t.id));
      return gone;
    });
    await resetPickems();
    return { log: { id, name: row?.name ?? null } };
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
    await resetPickems();
    return { log: { osuId, teamId } };
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
    await resetPickems();
    return { log: { osuId, heir: row?.isCaptain ? (heir ?? null) : undefined } };
  });
}

export async function seedTeams() {
  return guard("teams", "teams.seed", async () => {
    const teams = await seedBracket();
    return teams ? { log: { teams } } : { ok: false, error: "invalid" };
  });
}

export async function setBadges(osuId: number, _: ActionResult, fd: FormData) {
  return guard("teams", "teams.badges", async () => {
    const raw = String(fd.get("badges") ?? "").trim();
    const n = raw === "" ? null : Number(raw);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) return { ok: false, error: "invalid" };
    await db.update(users).set({ badgeOverride: n }).where(eq(users.osuId, osuId));
    return { log: { osuId, badges: n } };
  });
}
