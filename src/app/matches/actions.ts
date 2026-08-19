"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentOsuId } from "@/auth";
import { db } from "@/db";
import { matches, reschedules, teamMembers } from "@/db/schema";
import { OPEN } from "@/db/reschedules";
import { log } from "@/lib/authz";
import { fromSofiaInput, rescheduleDeadline } from "@/lib/time";

export type RescheduleResult = { ok: boolean; error?: "auth" | "notYours" | "tooLate" | "exists" | "invalid" | "error" } | null;

async function teamOf(osuId: number) {
  const [row] = await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.osuId, osuId)).limit(1);
  return row?.teamId ?? null;
}

export async function requestReschedule(matchId: string, _: RescheduleResult, fd: FormData): Promise<RescheduleResult> {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false, error: "auth" };
  const teamId = await teamOf(osuId);
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!m || !teamId || (m.team1Id !== teamId && m.team2Id !== teamId) || !m.team1Id || !m.team2Id || m.winner) return { ok: false, error: "notYours" };
  const now = Date.now();
  if (m.startsAt && rescheduleDeadline(m.startsAt).getTime() < now) return { ok: false, error: "tooLate" };
  const proposedAt = fromSofiaInput(String(fd.get("proposedAt") ?? ""));
  if (!proposedAt || proposedAt.getTime() < now) return { ok: false, error: "invalid" };
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300) || null;
  const [open] = await db
    .select({ id: reschedules.id })
    .from(reschedules)
    .where(and(eq(reschedules.matchId, matchId), inArray(reschedules.status, OPEN)))
    .limit(1);
  if (open) return { ok: false, error: "exists" };
  await db.insert(reschedules).values({ matchId, teamId, requestedBy: osuId, proposedAt, reason });
  await log(osuId, "reschedule.request", { matchId, proposedAt, reason });
  revalidatePath("/", "layout");
  return { ok: true };
}

async function mine(id: number, side: "own" | "other") {
  const osuId = await currentOsuId();
  if (!osuId) return null;
  const teamId = await teamOf(osuId);
  const [r] = await db.select().from(reschedules).where(eq(reschedules.id, id)).limit(1);
  const [m] = r ? await db.select().from(matches).where(eq(matches.id, r.matchId)).limit(1) : [];
  if (!r || !m || !teamId || !OPEN.includes(r.status)) return null;
  const inMatch = m.team1Id === teamId || m.team2Id === teamId;
  if (!inMatch || (side === "own") !== (r.teamId === teamId)) return null;
  return { osuId, r };
}

export async function answerReschedule(id: number, accept: boolean): Promise<RescheduleResult> {
  const who = await mine(id, "other");
  if (!who || who.r.status !== "pending") return { ok: false, error: "notYours" };
  const status = accept ? "accepted" : "declined";
  await db.update(reschedules).set({ status, answeredBy: who.osuId }).where(eq(reschedules.id, id));
  await log(who.osuId, `reschedule.${status}`, { id, matchId: who.r.matchId });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelReschedule(id: number): Promise<RescheduleResult> {
  const who = await mine(id, "own");
  if (!who) return { ok: false, error: "notYours" };
  await db.update(reschedules).set({ status: "cancelled" }).where(eq(reschedules.id, id));
  await log(who.osuId, "reschedule.cancelled", { id, matchId: who.r.matchId });
  revalidatePath("/", "layout");
  return { ok: true };
}
