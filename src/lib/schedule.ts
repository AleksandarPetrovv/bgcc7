import { addDays, dayDate, fmtDate, fromSofiaInput } from "./time";

export type SchedStatus = "pending" | "accepted" | "rejected" | "cancelled" | "withdrawn" | "staff";

export type Proposal = { id: number; teamId: string; by: number; at: string; status: SchedStatus; answeredBy: number | null; staff: boolean; createdAt: string; note: string | null; reply: string | null };

export function mondayOf(iso: string) {
  const d = dayDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return addDays(iso, -((d.getUTCDay() + 6) % 7));
}

/** a day of the match week (0 = its monday) at a sofia time */
export type WeekPoint = { day: number; time: string };
export const MATCH_FROM: WeekPoint = { day: 4, time: "18:00" };
export const MATCH_TO: WeekPoint = { day: 6, time: "21:00" };
export const DEADLINE: WeekPoint = { day: 2, time: "23:59" };

const pointOf = (monday: string, p: WeekPoint) => `${addDays(monday, p.day)}T${p.time}`;

/** "Friday 18:00" / "петък 18:00"; short keeps 3 letters of the day ("Fri", "пет") */
export function pointLabel(locale: string, p: WeekPoint, short = false) {
  // 2024-01-01 is a monday
  const day = fmtDate(new Date(Date.UTC(2024, 0, 1 + p.day)), locale, { weekday: "long" }, "UTC");
  return `${short ? day.slice(0, 3) : day} ${p.time}`;
}

export type Week = { deadline: Date; from: Date; to: Date; min: string; max: string };

export function weekOf(monday: string | null | undefined): Week | null {
  if (!monday) return null;
  const fri = pointOf(monday, MATCH_FROM);
  const sun = pointOf(monday, MATCH_TO);
  const deadline = fromSofiaInput(pointOf(monday, DEADLINE));
  const from = fromSofiaInput(fri);
  const to = fromSofiaInput(sun);
  if (!deadline || !from || !to) return null;
  return { deadline: new Date(deadline.getTime() + 59_999), from, to, min: fri, max: sun };
}

export const inWindow = (w: Week, at: Date) => at.getTime() >= w.from.getTime() && at.getTime() <= w.to.getTime();
export const isOpen = (w: Week | null, now = Date.now()) => !!w && now <= w.deadline.getTime();

/** minutes between pickable times */
export const PICK_STEP = 30;
/** first and last time players can't pick (sofia); 00:00 is the latest slot of a night. staff can still set any time */
export const OFF_HOURS = { from: "00:30", to: "11:30" } as const;
const toMin = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);

export const offHours = (v: string) => {
  const m = +v.slice(11, 13) * 60 + +(v.slice(14, 16) || 0);
  return m > toMin(OFF_HOURS.from) - PICK_STEP && m < toMin(OFF_HOURS.to) + PICK_STEP;
};

/** every playable hour of the window as "YYYY-MM-DDTHH" (sofia) */
export function hourKeys(min: string, max: string) {
  const out: string[] = [];
  for (let d = new Date(`${min.slice(0, 13)}:00Z`); ; d.setUTCHours(d.getUTCHours() + 1)) {
    const k = d.toISOString().slice(0, 13);
    if (!offHours(`${k}:59`) || k.endsWith("T00")) out.push(k);
    if (k >= max.slice(0, 13) || out.length > 24 * 8) return out;
  }
}

/** the hour key a datetime-local value ("YYYY-MM-DDTHH:mm") falls in */
export const hourOf = (v: string) => v.slice(0, 13);
