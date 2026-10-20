"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lobbyBookings, registrations, teamMembers } from "@/db/schema";
import { getBwsLock, isStatus } from "@/db/registrations";
import { tourneyBadges } from "@/lib/bws";
import { saveOsuUser } from "@/db/users";
import { guard } from "@/lib/admin-action";
import { getUser } from "@/lib/osu-api";
import type { ActionResult } from "@/lib/roles";

// once teams are drawn a player is moved in admin/teams first, so seeds and rosters stay in sync
const onTeam = async (osuId: number) => (await db.select({ id: teamMembers.osuId }).from(teamMembers).where(eq(teamMembers.osuId, osuId)).limit(1)).length > 0;

export async function decide(osuId: number, _: ActionResult, fd: FormData) {
  return guard("screening", "screening.decide", async (by) => {
    const status = fd.get("status");
    if (!isStatus(status)) return { ok: false, error: "invalid" };
    const note = String(fd.get("note") ?? "").trim().slice(0, 300) || null;
    if (status === "denied" && !note) return { ok: false, error: "note" };
    if (status !== "approved" && (await onTeam(osuId))) return { ok: false, error: "invalid" };
    await db
      .update(registrations)
      .set({ status, note, decidedBy: status === "pending" ? null : by, decidedAt: status === "pending" ? null : new Date() })
      .where(eq(registrations.osuId, osuId));
    if (status !== "approved") await db.delete(lobbyBookings).where(eq(lobbyBookings.osuId, osuId));
    return { osuId, status, note };
  });
}

export async function approveAllPending() {
  return guard("screening", "screening.approveAll", async (by) => {
    const rows = await db
      .update(registrations)
      .set({ status: "approved", decidedBy: by, decidedAt: new Date() })
      .where(eq(registrations.status, "pending"))
      .returning({ osuId: registrations.osuId });
    return { approved: rows.length };
  });
}

export async function refreshStats() {
  return guard("screening", "screening.refreshStats", async () => {
    const ids = (await db.select({ osuId: registrations.osuId }).from(registrations)).map((r) => r.osuId);
    let updated = 0;
    for (let i = 0; i < ids.length; i += 5) {
      const batch = await Promise.all(ids.slice(i, i + 5).map((id) => getUser(id).catch(() => null)));
      for (const u of batch) {
        if (!u) continue;
        await saveOsuUser(u);
        updated++;
      }
    }
    return { updated, total: ids.length };
  });
}

export async function addPlayer(_: ActionResult, fd: FormData) {
  return guard("screening", "screening.add", async (by) => {
    const q = String(fd.get("q") ?? "").trim();
    if (!q || q.length > 32) return { ok: false, error: "invalid" };
    const u = await getUser(q);
    if (!u) return { ok: false, error: "notFound" };
    await saveOsuUser(u);
    const lock = (await getBwsLock()) ? { rankLock: u.statistics?.global_rank ?? null, badgesLock: u.badges ? tourneyBadges(u.badges) : 0 } : {};
    const set = { status: "approved", decidedBy: by, decidedAt: new Date(), ...lock };
    await db
      .insert(registrations)
      .values({ osuId: u.id, ...set })
      .onConflictDoUpdate({ target: registrations.osuId, set });
    return { osuId: u.id, username: u.username };
  });
}

export async function removeRegistration(osuId: number) {
  return guard("screening", "screening.remove", async () => {
    if (await onTeam(osuId)) return { ok: false, error: "invalid" };
    await db.delete(registrations).where(eq(registrations.osuId, osuId));
    await db.delete(lobbyBookings).where(eq(lobbyBookings.osuId, osuId));
    return { osuId };
  });
}
