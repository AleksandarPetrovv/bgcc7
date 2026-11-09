import type { Format } from "./format";
import { addDays, fromSofiaInput } from "./time";

/** a pool's suggestion window: opens the tuesday 00:00 after the previous pool settled (the first one with the playoffs phase),
 *  closes and settles the sunday 23:59 before the monday of the first week any round plays it */
export type PoolWindow = { stage: string; week: number; opens: Date | null; closes: Date };

export function poolWindows(rounds: Format["rounds"], weeks: Record<string, string>): PoolWindow[] {
  const due = new Map<string, number>();
  for (const r of Object.values(rounds)) due.set(r.stage, Math.min(due.get(r.stage) ?? Infinity, r.week));
  const out: PoolWindow[] = [];
  let prev: string | null = null;
  for (const [stage, week] of [...due].sort((a, b) => a[1] - b[1])) {
    const monday = weeks[String(week)];
    const closes = monday ? fromSofiaInput(`${addDays(monday, -1)}T23:59`) : null;
    if (!closes) break;
    out.push({ stage, week, opens: prev ? fromSofiaInput(`${addDays(prev, 1)}T00:00`) : null, closes });
    prev = monday;
  }
  return out;
}

export type PoolAccess = { open: PoolWindow | null; next: PoolWindow | null; done: boolean };

/** what poolers and testers can reach: at most one stage, the next one to count down to, or nothing ever again */
export function poolAccess(ws: PoolWindow[], settled: Set<string>, playoffs: boolean, now = Date.now()): PoolAccess {
  const left = ws.filter((w) => !settled.has(w.stage));
  const started = (w: PoolWindow) => (w.opens ? now >= w.opens.getTime() : playoffs);
  const open = left.find((w) => started(w) && now < w.closes.getTime()) ?? null;
  return { open, next: open ? null : (left.find((w) => !started(w)) ?? null), done: ws.length > 0 && !left.length };
}
