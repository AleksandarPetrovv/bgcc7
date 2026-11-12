"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matches, reschedules, settings } from "@/db/schema";
import { getFormat } from "@/db/edition";
import { weekNum, weekNums } from "@/lib/format";
import { lockMatch, staffOverride } from "@/db/schedule";
import { announceMatchTime, setMatchTime } from "@/db/match";
import { guard, unchanged } from "@/lib/admin-action";
import { settleLate } from "@/db/pool-settle";
import type { ActionResult } from "@/lib/action-result";
import { addDays, fromSofiaInput } from "@/lib/time";
import { DEADLINE, inWindow, MATCH_TO, mondayOf, weekOf } from "@/lib/schedule";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** the match weeks form: `week.<n>` any day of the week, `closes.<n>` the day scheduling closes (empty = the week's default day) */
export async function setWeeks(_: ActionResult, fd: FormData) {
  return guard("host", "schedule.week", async ({ osuId }) => {
    const f = getFormat();
    const next: Record<string, string> = {};
    const picked: Record<string, string> = {};
    for (const n of weekNums(f)) {
      const raw = String(fd.get(`week.${n}`) ?? "").trim();
      const week = raw ? mondayOf(raw) : null;
      const closes = String(fd.get(`closes.${n}`) ?? "").trim();
      // scheduling can't close after the week's last match slot
      if ((raw && !week) || (closes && (!DAY.test(closes) || !week || closes > addDays(week, MATCH_TO.day)))) return { ok: false, error: "invalid" };
      if (week) next[n] = week;
      if (closes) picked[n] = closes;
    }
    const usual = (monday: string | undefined) => (monday ? addDays(monday, DEADLINE.day) : null);
    const changed = await db.transaction(async (tx) => {
      const [row] = await tx.select({ weeks: settings.weeks, closes: settings.weekCloses }).from(settings).where(eq(settings.id, 1)).for("update").limit(1);
      const nextCloses: Record<string, string> = {};
      for (const n of weekNums(f)) {
        const was = row?.closes[n] ?? usual(row?.weeks[n]);
        // a moved week whose close was left as it stood goes back to its usual day; the usual day is never stored
        const kept = next[n] !== row?.weeks[n] && picked[n] === was;
        if (picked[n] && !kept && picked[n] !== usual(next[n])) nextCloses[n] = picked[n];
      }
      const moved = weekNums(f).filter((n) => (row?.weeks[n] ?? null) !== (next[n] ?? null));
      const reclosed = weekNums(f).filter((n) => (row?.closes[n] ?? null) !== (nextCloses[n] ?? null));
      if (!moved.length && !reclosed.length) return null;
      await tx.update(settings).set({ weeks: next, weekCloses: nextCloses }).where(eq(settings.id, 1));
      const all = moved.length ? await tx.select({ id: matches.id, startsAt: matches.startsAt }).from(matches).for("update") : [];
      for (const n of moved) {
        const w = weekOf(next[n]);
        const ms = all.filter((m) => weekNum(f, m.id) === n);
        if (!ms.length) continue;
        const ids = ms.map((m) => m.id);
        const pend = await tx.select().from(reschedules).where(and(inArray(reschedules.matchId, ids), eq(reschedules.status, "pending")));
        const drop = pend.filter((p) => !w || !inWindow(w, p.proposedAt)).map((p) => p.id);
        if (drop.length) await tx.update(reschedules).set({ status: "cancelled", decidedBy: osuId }).where(inArray(reschedules.id, drop));
        const off = w ? ms.filter((m) => m.startsAt && !inWindow(w, m.startsAt)).map((m) => m.id) : [];
        if (off.length) {
          await tx.update(matches).set({ startsAt: null }).where(inArray(matches.id, off));
          await tx.update(reschedules).set({ status: "cancelled", decidedBy: osuId }).where(and(inArray(reschedules.matchId, off), eq(reschedules.status, "accepted")));
        }
      }
      return { weeks: Object.fromEntries(moved.map((n) => [n, next[n] ?? null])), closes: Object.fromEntries(reclosed.map((n) => [n, nextCloses[n] ?? null])) };
    });
    if (!changed) return unchanged;
    const answer = String(fd.get("confirm") ?? "");
    if (answer === "yes" || answer === "skip") await settleLate(answer === "yes");
    return { log: { ...changed, pools: answer || undefined } };
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
    if (!out.same && at) announceMatchTime(out, at, { dm: true });
    return { log: { match: id, at: at?.toISOString() ?? null } };
  }, { match: id });
}
