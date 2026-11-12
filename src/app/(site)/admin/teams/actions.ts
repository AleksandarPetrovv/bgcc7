"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { availability, registrations, teamMembers, teams, users } from "@/db/schema";
import { getFormat } from "@/db/edition";
import { bringBack, ruleOut, undoForfeit as takeBack } from "@/db/team-out";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";
import { isOutKind, type OutKind } from "@/lib/out";
import { snapshot } from "@/lib/snapshot";
import { admitPlayer, lockBws as lock, unlockBws as unlock } from "@/db/registrations";
import { resolveOsuUser } from "@/db/users";
import { frozenSeeds } from "@/db/seeds";

/** seeds are frozen from the first spin, so the ranks can't change after it */
export async function lockBws() {
  return guard("host", "bws.lock", async () => {
    if ((await frozenSeeds()).length) return { ok: false, error: "locked" };
    return { log: { players: await lock() } };
  });
}

export async function unlockBws() {
  return guard("host", "bws.unlock", async () => {
    if ((await frozenSeeds()).length) return { ok: false, error: "locked" };
    await unlock();
    return { log: {} };
  });
}

const resync = () => void import("@/db/discord-bot").then((d) => d.syncTeams());

/** `once`: a forfeit of the next match only. a reason is required for dq and other */
export async function disableTeam(id: string, kind: OutKind, reason: string, once: boolean) {
  return guard("host", "team.out", async () => {
    const why = reason.trim().slice(0, 300);
    const single = once && kind === "forfeit";
    if (!isOutKind(kind) || (kind !== "forfeit" && !why)) return { ok: false, error: "invalid" };
    if (!single) await snapshot("team-out");
    if (!(await ruleOut(id, kind, kind === "forfeit" ? null : why, single))) return { ok: false, error: "invalid" };
    resync();
    return { log: { id, kind, reason: why, once: single } };
  });
}

/** takes back a one-match forfeit of a team that is still in; "invalid" once the bracket moved on */
export async function undoForfeit(id: string) {
  return guard("host", "team.back", async () => {
    if (!(await takeBack(id))) return { ok: false, error: "invalid" };
    return { log: { id, forfeit: true } };
  });
}

/** fails with "invalid" once the bracket moved on past the team's walkovers */
export async function enableTeam(id: string) {
  return guard("host", "team.back", async () => {
    if (!(await bringBack(id))) return { ok: false, error: "invalid" };
    resync();
    return { log: { id } };
  });
}

export async function updateTeam(id: string, _: ActionResult, fd: FormData) {
  return guard("host", "team.update", async () => {
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
    return { log: { id, name, image, captain } };
  });
}

export async function placeMember(_: ActionResult, fd: FormData) {
  return guard("host", "team.placeMember", async ({ osuId: by }) => {
    const teamId = String(fd.get("teamId") ?? "");
    // `q`: an osu! id typed by a host, anyone on osu!; whoever isn't an approved player yet becomes one
    const typed = fd.has("q") ? await resolveOsuUser(fd.get("q")) : null;
    if (fd.has("q") && !typed) return { ok: false, error: "notFound" };
    const osuId = typed?.id ?? Number(fd.get("osuId"));
    if (!Number.isInteger(osuId) || !teamId) return { ok: false, error: "invalid" };
    if (typed && (await db.select({ status: registrations.status }).from(registrations).where(eq(registrations.osuId, osuId)).limit(1))[0]?.status !== "approved") await admitPlayer(typed, by);
    const [old] = await db.select().from(teamMembers).where(eq(teamMembers.osuId, osuId)).limit(1);
    const mates = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (mates.filter((m) => m.osuId !== osuId).length >= getFormat().teamSize) return { ok: false, error: "invalid" };
    const lead = !mates.some((m) => m.isCaptain && m.osuId !== osuId);
    await db
      .insert(teamMembers)
      .values({ osuId, teamId, isCaptain: lead })
      .onConflictDoUpdate({ target: teamMembers.osuId, set: { teamId, isCaptain: lead } });
    if (old && old.teamId !== teamId) await db.delete(availability).where(eq(availability.osuId, osuId));
    if (old?.isCaptain && old.teamId !== teamId) await promote(old.teamId);
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
  return guard("host", "team.removeMember", async () => {
    const [row] = await db.delete(teamMembers).where(eq(teamMembers.osuId, osuId)).returning();
    if (row) await db.delete(availability).where(eq(availability.osuId, osuId));
    if (row?.isCaptain) await promote(row.teamId, heir);
    return { log: { osuId, heir: row?.isCaptain ? (heir ?? null) : undefined } };
  });
}
