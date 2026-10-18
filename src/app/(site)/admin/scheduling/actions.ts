"use server";

import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { currentEdition, db, withEdition } from "@/db";
import { matches, reschedules, stages } from "@/db/schema";
import { lockMatch, notifyCaptain, fmtAt, staffOverride } from "@/db/schedule";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";
import { fromSofiaInput } from "@/lib/time";
import { inWindow, mondayOf, weekOf } from "@/lib/schedule";

export async function setWeek(slug: string, _: ActionResult, fd: FormData) {
  return guard("matches", "schedule.week", async (osuId) => {
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
    return { stage: slug, week };
  });
}

export async function setTime(id: string, _: ActionResult, fd: FormData) {
  let notify: { teams: string[]; at: Date } | null = null;
  const res = await guard("matches", "schedule.set", async (osuId) => {
    const raw = String(fd.get("at") ?? "").trim();
    const at = raw ? fromSofiaInput(raw) : null;
    if (raw && !at) return { ok: false, error: "invalid" };
    const out = await db.transaction(async (tx) => {
      const m = await lockMatch(tx, id);
      if (!m) return null;
      if ((m.startsAt?.getTime() ?? null) === (at?.getTime() ?? null)) return { ...m, same: true };
      await staffOverride(tx, id, osuId);
      await tx.update(matches).set({ startsAt: at }).where(eq(matches.id, id));
      if (at && m.team1Id) await tx.insert(reschedules).values({ matchId: id, teamId: m.team1Id, requestedBy: osuId, proposedAt: at, status: "staff", decidedBy: osuId });
      return { ...m, same: false };
    });
    if (!out) return { ok: false, error: "notFound" };
    if (out.same) return { match: id, at: at?.toISOString() ?? null };
    if (at) notify = { teams: [out.team1Id, out.team2Id].filter((x): x is string => !!x), at };
    return { match: id, at: at?.toISOString() ?? null };
  });
  const n = notify as { teams: string[]; at: Date } | null;
  if (res?.ok && n) {
    const ed = currentEdition();
    after(() => withEdition(ed, () => Promise.all(n.teams.map((team) => notifyCaptain(team, (link) => `**BGCC7 scheduling**: staff set your match to **${fmtAt(n.at)}**. ${link}`).catch(() => {})))));
  }
  return res;
}
