"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { registrations, teamMembers } from "@/db/schema";
import { getBwsLock, isStatus, removeRegistration as dropRegistration, setRegistrationStatus, snapshotBws } from "@/db/registrations";
import { refreshUsers, resolveOsuUser, saveOsuUser } from "@/db/users";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";

// once teams are drawn a player is moved in admin/teams first, so seeds and rosters stay in sync
const onTeam = async (osuId: number) => (await db.select({ id: teamMembers.osuId }).from(teamMembers).where(eq(teamMembers.osuId, osuId)).limit(1)).length > 0;

export async function decide(osuId: number, _: ActionResult, fd: FormData) {
  return guard("screening", "screening.decide", async ({ osuId: by }) => {
    const status = fd.get("status");
    if (!isStatus(status)) return { ok: false, error: "invalid" };
    const note = String(fd.get("note") ?? "").trim().slice(0, 300) || null;
    if (status === "denied" && !note) return { ok: false, error: "note" };
    if (status !== "approved" && (await onTeam(osuId))) return { ok: false, error: "invalid" };
    await setRegistrationStatus(osuId, status, note, by);
    return { log: { osuId, status, note } };
  });
}

export async function approveAllPending() {
  return guard("screening", "screening.approveAll", async ({ osuId: by }) => {
    const rows = await db
      .update(registrations)
      .set({ status: "approved", decidedBy: by, decidedAt: new Date() })
      .where(eq(registrations.status, "pending"))
      .returning({ osuId: registrations.osuId });
    return { log: { approved: rows.length } };
  });
}

export async function refreshStats() {
  return guard("screening", "screening.refreshStats", async () => {
    const ids = (await db.select({ osuId: registrations.osuId }).from(registrations)).map((r) => r.osuId);
    return { log: { updated: await refreshUsers(ids), total: ids.length } };
  });
}

export async function addPlayer(_: ActionResult, fd: FormData) {
  return guard("screening", "screening.add", async ({ osuId: by }) => {
    const u = await resolveOsuUser(fd.get("q"));
    if (!u) return { ok: false, error: "notFound" };
    await saveOsuUser(u);
    const set = { status: "approved", decidedBy: by, decidedAt: new Date() };
    await db
      .insert(registrations)
      .values({ osuId: u.id, ...set })
      .onConflictDoUpdate({ target: registrations.osuId, set });
    // added after the bws lock: freeze this player's rank like everyone else's
    if (await getBwsLock()) await snapshotBws(u.id);
    return { log: { osuId: u.id, username: u.username } };
  });
}

export async function removeRegistration(osuId: number) {
  return guard("screening", "screening.remove", async () => {
    if (await onTeam(osuId)) return { ok: false, error: "invalid" };
    await dropRegistration(osuId);
    return { log: { osuId } };
  });
}
