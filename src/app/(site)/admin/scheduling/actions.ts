"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matches, reschedules, settings } from "@/db/schema";
import { getFormat } from "@/db/edition";
import { weekNum, weekNums } from "@/lib/format";
import { lockMatch, staffOverride } from "@/db/schedule";
import { announceMatchTime, setMatchTime } from "@/db/match";
import { guard } from "@/lib/admin-action";
import { settleLate } from "@/db/pool-settle";
import type { ActionResult } from "@/lib/action-result";
import { fromSofiaInput } from "@/lib/time";
import { inWindow, mondayOf, weekOf } from "@/lib/schedule";

export async function setWeek(n: number, _: ActionResult, fd: FormData) {
  return guard("host", "schedule.week", async ({ osuId }) => {
    const raw = String(fd.get("week") ?? "").trim();
    const week = raw ? mondayOf(raw) : null;
    if (raw && !week) return { ok: false, error: "invalid" };
    const f = getFormat();
    if (!weekNums(f).includes(n)) return { ok: false, error: "notFound" };
    await db.transaction(async (tx) => {
      const [row] = await tx.select({ weeks: settings.weeks }).from(settings).where(eq(settings.id, 1)).for("update").limit(1);
      const weeks = { ...row?.weeks };
      if ((weeks[n] ?? null) === week) return;
      if (week) weeks[n] = week;
      else delete weeks[n];
      await tx.update(settings).set({ weeks }).where(eq(settings.id, 1));
      const w = weekOf(week);
      const ms = (await tx.select({ id: matches.id, startsAt: matches.startsAt }).from(matches).for("update")).filter((m) => weekNum(f, m.id) === n);
      if (!ms.length) return;
      const ids = ms.map((m) => m.id);
      const pend = await tx.select().from(reschedules).where(and(inArray(reschedules.matchId, ids), eq(reschedules.status, "pending")));
      const drop = pend.filter((p) => !w || !inWindow(w, p.proposedAt)).map((p) => p.id);
      if (drop.length) await tx.update(reschedules).set({ status: "cancelled", decidedBy: osuId }).where(inArray(reschedules.id, drop));
      const off = w ? ms.filter((m) => m.startsAt && !inWindow(w, m.startsAt)).map((m) => m.id) : [];
      if (off.length) {
        await tx.update(matches).set({ startsAt: null }).where(inArray(matches.id, off));
        await tx.update(reschedules).set({ status: "cancelled", decidedBy: osuId }).where(and(inArray(reschedules.matchId, off), eq(reschedules.status, "accepted")));
      }
    });
    const answer = String(fd.get("confirm") ?? "");
    if (answer === "yes" || answer === "skip") await settleLate(answer === "yes");
    return { log: { n, week, pools: answer || undefined } };
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
  }, { match: id });
}
