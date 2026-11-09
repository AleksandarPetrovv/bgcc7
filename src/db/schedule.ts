import "server-only";
import { cache } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, isBGCC6, type Tx } from "./index";
import { availability, matches, reschedules, settings, users } from "./schema";
import { safe } from "./safe";
import { getAllTeams, getMatchRows, type MatchRow } from "./tournament";
import { siteUrl } from "@/lib/links";
import { dm, discordReady } from "@/lib/discord";
import { isOpen, weekOf, type Proposal, type SchedStatus } from "@/lib/schedule";
import { weekNum } from "@/lib/format";
import { getFormat } from "./edition";
import type { Team } from "@/lib/data";

export const captainOf = (t: Team | undefined) => t?.players[0]?.userId ?? null;

/** match week number → its monday */
export const matchWeeks = cache(() => safe(async () => (await db.select({ weeks: settings.weeks }).from(settings).where(eq(settings.id, 1)).limit(1))[0]?.weeks ?? {}, {} as Record<string, string>));

/** the monday of the week a match is played in */
export const matchWeek = (weeks: Record<string, string>, matchId: string) => weeks[String(weekNum(getFormat(), matchId))] ?? null;

/** first and last day a pool stage is played: the span of its rounds' weeks */
export function stageDays(weeks: Record<string, string>) {
  const out: Record<string, [string, string]> = {};
  for (const r of Object.values(getFormat().rounds)) {
    const w = weekOf(weeks[String(r.week)]);
    if (!w) continue;
    const lo = w.min.slice(0, 10);
    const hi = w.max.slice(0, 10);
    const had = out[r.stage];
    out[r.stage] = had ? [had[0] < lo ? had[0] : lo, had[1] > hi ? had[1] : hi] : [lo, hi];
  }
  return out;
}

export const schedulable = (m: MatchRow) => !!m.team1Id && !!m.team2Id && m.winner == null;

export type SchedMatch = {
  id: string;
  slug: string;
  round: string;
  stage: string;
  week: string | null;
  startsAt: string | null;
  mine: string;
  opp: string;
  history: Proposal[];
  busy: Record<number, string[]>;
};

const toProposal = (r: typeof reschedules.$inferSelect): Proposal => ({
  id: r.id,
  teamId: r.teamId,
  by: r.requestedBy,
  at: r.proposedAt.toISOString(),
  status: r.status as SchedStatus,
  answeredBy: r.answeredBy,
  staff: r.decidedBy != null,
  createdAt: r.createdAt.toISOString(),
  note: r.reason,
  reply: r.reply,
});

export async function historyOf(ids: string[]) {
  if (!ids.length) return new Map<string, Proposal[]>();
  const rows = await db.select().from(reschedules).where(inArray(reschedules.matchId, ids)).orderBy(desc(reschedules.createdAt), desc(reschedules.id));
  const out = new Map<string, Proposal[]>();
  for (const r of rows) out.set(r.matchId, [...(out.get(r.matchId) ?? []), toProposal(r)]);
  return out;
}

export async function busyOf(ids: string[]) {
  const out = new Map<string, Record<number, string[]>>();
  if (!ids.length) return out;
  for (const r of await db.select().from(availability).where(inArray(availability.matchId, ids))) out.set(r.matchId, { ...out.get(r.matchId), [r.osuId]: r.busy });
  return out;
}

export const mySchedule = cache(async (team: string | null): Promise<SchedMatch[]> => {
  if (!team) return [];
  const [rows, weeks] = await Promise.all([getMatchRows(), matchWeeks()]);
  const mine = rows.filter((m) => schedulable(m) && (m.team1Id === team || m.team2Id === team));
  const [hist, busy] = await Promise.all([safe(() => historyOf(mine.map((m) => m.id)), new Map<string, Proposal[]>()), safe(() => busyOf(mine.map((m) => m.id)), new Map<string, Record<number, string[]>>())]);
  return mine.map((m) => ({
    id: m.id,
    slug: m.id,
    round: m.round,
    stage: m.stageSlug,
    week: matchWeek(weeks, m.id),
    startsAt: m.startsAt?.toISOString() ?? null,
    mine: team,
    opp: m.team1Id === team ? m.team2Id! : m.team1Id!,
    history: hist.get(m.id) ?? [],
    busy: busy.get(m.id) ?? {},
  }));
});

export const waitingOnMe = (m: SchedMatch) => isOpen(weekOf(m.week)) && m.history.some((p) => p.status === "pending" && p.teamId === m.opp);

const soon = (m: SchedMatch, now = Date.now()) => {
  const w = weekOf(m.week);
  return !!w && isOpen(w, now) && !m.startsAt && w.from.getTime() - now <= 14 * 864e5;
};
export const needsTime = (m: SchedMatch) => soon(m) && !m.history.some((p) => p.status === "pending" && p.teamId === m.mine);
export const needsHours = (m: SchedMatch, osuId: number) => soon(m) && !(osuId in m.busy);

// anyone logged in can link from registration on (linking early is fine; team roles only follow once they're on a team)
export const canLinkDiscord = () => discordReady() && !isBGCC6();

export async function lockMatch(tx: Tx, id: string) {
  const [m] = await tx.select().from(matches).where(eq(matches.id, id)).for("update").limit(1);
  return m ?? null;
}

export const staffOverride = (tx: Pick<typeof db, "update">, matchId: string, by: number | null, only: ("pending" | "accepted")[] = ["pending", "accepted"]) =>
  tx.update(reschedules).set({ status: "cancelled", decidedBy: by }).where(and(eq(reschedules.matchId, matchId), inArray(reschedules.status, only)));

export const pendingOf = (tx: Tx, id: string) =>
  tx.select().from(reschedules).where(and(eq(reschedules.matchId, id), eq(reschedules.status, "pending")));

export async function notifyCaptain(teamId: string, text: (link: string) => string) {
  if (!discordReady()) return;
  const t = (await getAllTeams()).find((x) => x.id === teamId);
  const cap = captainOf(t);
  if (!cap) return;
  const [u] = await db.select({ discordId: users.discordId }).from(users).where(eq(users.osuId, cap)).limit(1);
  if (!u?.discordId) return;
  await dm(u.discordId, text(`<${siteUrl()}/scheduling>`)).catch((e) => console.error("[discord] dm", e));
}

