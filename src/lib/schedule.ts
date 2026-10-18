import { fromSofiaInput } from "./time";

export type SchedStatus = "pending" | "accepted" | "rejected" | "cancelled" | "withdrawn" | "staff";

export type Proposal = { id: number; teamId: string; by: number; at: string; status: SchedStatus; answeredBy: number | null; staff: boolean; createdAt: string };

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function mondayOf(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
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
