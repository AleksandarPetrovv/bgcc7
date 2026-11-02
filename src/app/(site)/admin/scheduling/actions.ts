"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matches, reschedules, stages } from "@/db/schema";
import { lockMatch, staffOverride } from "@/db/schedule";
import { announceMatchTime, setMatchTime } from "@/db/match";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";
import { fromSofiaInput } from "@/lib/time";
import { inWindow, mondayOf, weekOf } from "@/lib/schedule";

export async function setWeek(slug: string, _: ActionResult, fd: FormData) {
  return guard("matches", "schedule.week", async ({ osuId }) => {
    const raw = String(fd.get("week") ?? "").trim();
    const week = raw ? mondayOf(raw) : null;
    if (raw && !week) return { ok: false, error: "invalid" };
    const found = await db.transaction(async (tx) => {
      const [st] = await tx.select({ week: stages.week }).from(stages).where(eq(stages.slug, slug)).for("update").limit(1);
      if (!st) return false;
      await tx.update(stages).set({ week }).where(eq(stages.slug, slug));
      if (st.week === week) return true;
      const w = weekOf(week);
      const ms = await tx.select({ id: matches.id, startsAt: matches.startsAt }).from(matches).where(eq(matches.stageSlug, slug)).for("update");
      if (!ms.length) return true;
      const ids = ms.map((m) => m.id);
      const pend = await tx.select().from(reschedules).where(and(inArray(reschedules.matchId, ids), eq(reschedules.status, "pending")));
      const drop = pend.filter((p) => !w || !inWindow(w, p.proposedAt)).map((p) => p.id);
      if (drop.length) await tx.update(reschedules).set({ status: "cancelled", decidedBy: osuId }).where(inArray(reschedules.id, drop));
      const off = w ? ms.filter((m) => m.startsAt && !inWindow(w, m.startsAt)).map((m) => m.id) : [];
      if (off.length) {
        await tx.update(matches).set({ startsAt: null }).where(inArray(matches.id, off));
        await tx.update(reschedules).set({ status: "cancelled", decidedBy: osuId }).where(and(inArray(reschedules.matchId, off), eq(reschedules.status, "accepted")));
      }
      return true;
    });
    if (!found) return { ok: false, error: "notFound" };
    return { log: { stage: slug, week } };
  });
}

export async function setTime(id: string, _: ActionResult, fd: FormData) {
  return guard("matches", "schedule.set", async ({ osuId }) => {
    const raw = String(fd.get("at") ?? "").trim();
    const at = raw ? fromSofiaInput(raw) : null;
    if (raw && !at) return { ok: false, error: "invalid" };
    const out = await db.transaction(async (tx) => {
      const m = await lockMatch(tx, id);
      if (!m) return null;
      if ((m.startsAt?.getTime() ?? null) === (at?.getTime() ?? null)) {
        await staffOverride(tx, id, osuId);
        return { ...m, same: true };
      }
      await setMatchTime(tx, m, at, osuId);
      return { ...m, same: false };
    });
    if (!out) return { ok: false, error: "notFound" };
    if (!out.same && at) announceMatchTime([out.team1Id, out.team2Id], at, { dm: true });
    return { log: { match: id, at: at?.toISOString() ?? null } };
  });
}
