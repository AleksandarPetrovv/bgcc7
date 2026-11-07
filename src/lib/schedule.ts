import { addDays, dayDate, fromSofiaInput } from "./time";

export type SchedStatus = "pending" | "accepted" | "rejected" | "cancelled" | "withdrawn" | "staff";

export type Proposal = { id: number; teamId: string; by: number; at: string; status: SchedStatus; answeredBy: number | null; staff: boolean; createdAt: string; note: string | null; reply: string | null };

export function mondayOf(iso: string) {
  const d = dayDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return addDays(iso, -((d.getUTCDay() + 6) % 7));
}

export type Week = { deadline: Date; from: Date; to: Date; min: string; max: string };

export function weekOf(monday: string | null | undefined): Week | null {
  if (!monday) return null;
  const fri = `${addDays(monday, 4)}T18:00`;
  const sun = `${addDays(monday, 6)}T21:00`;
  const deadline = fromSofiaInput(`${addDays(monday, 2)}T23:59`);
  const from = fromSofiaInput(fri);
  const to = fromSofiaInput(sun);
  if (!deadline || !from || !to) return null;
  return { deadline: new Date(deadline.getTime() + 59_999), from, to, min: fri, max: sun };
}

export const inWindow = (w: Week, at: Date) => at.getTime() >= w.from.getTime() && at.getTime() <= w.to.getTime();
export const isOpen = (w: Week | null, now = Date.now()) => !!w && now <= w.deadline.getTime();

/** players can't pick 00:30–11:30 (sofia); 00:00 is the latest slot of a night. staff can still set any time */
export const offHours = (v: string) => {
  const m = +v.slice(11, 13) * 60 + +(v.slice(14, 16) || 0);
  return m > 0 && m < 12 * 60;
};

/** every playable hour of the window as "YYYY-MM-DDTHH" (sofia), from fri 18 to sun 21 */
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
