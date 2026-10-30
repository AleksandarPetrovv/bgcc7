import "server-only";
import { cache } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, isBGCC6, type Tx } from "./index";
import { availability, matches, reschedules, stages, users } from "./schema";
import { safe } from "./safe";
import { getAllTeams, getMatchRows, getTeams, type MatchRow } from "./tournament";
import { getSettings } from "./settings";
import { siteUrl } from "@/lib/links";
import { dm, discordReady } from "@/lib/discord";
import { isOpen, weekOf, type Proposal, type SchedStatus } from "@/lib/schedule";
import type { Team } from "@/lib/data";

export const captainOf = (t: Team | undefined) => t?.players[0]?.userId ?? null;

export const stageWeeks = cache(() =>
  safe(async () => Object.fromEntries((await db.select({ slug: stages.slug, week: stages.week }).from(stages)).map((s) => [s.slug, s.week])) as Record<string, string | null>, {} as Record<string, string | null>),
);

export const myCaptainTeam = cache(async (osuId: number) => {
  const ts = await getTeams();
  return ts.find((t) => captainOf(t) === osuId)?.id ?? null;
});

// any team the player is on, knocked out or not
export const teamOf = cache(async (osuId: number) => (await getTeams()).find((t) => t.players.some((p) => p.userId === osuId))?.id ?? null);

// null once the team is knocked out (2 losses in double elim), so scheduling disappears for the whole team
export const myTeam = cache(async (osuId: number) => {
  const [ts, rows] = await Promise.all([getTeams(), getMatchRows()]);
  const id = ts.find((t) => t.players.some((p) => p.userId === osuId))?.id ?? null;
  if (!id) return null;
  const losses = rows.filter((m) => m.winner != null && (m.winner === 1 ? m.team2Id : m.team1Id) === id).length;
  return losses >= 2 ? null : id;
});

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
  /** osu id -> hours that player can't play */
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

export const mySchedule = cache(async (osuId: number): Promise<SchedMatch[]> => {
  const team = await myTeam(osuId);
  if (!team) return [];
  const [rows, weeks] = await Promise.all([getMatchRows(), stageWeeks()]);
  const mine = rows.filter((m) => schedulable(m) && (m.team1Id === team || m.team2Id === team));
  const [hist, busy] = await Promise.all([safe(() => historyOf(mine.map((m) => m.id)), new Map<string, Proposal[]>()), safe(() => busyOf(mine.map((m) => m.id)), new Map<string, Record<number, string[]>>())]);
  return mine.map((m) => ({
    id: m.id,
    slug: m.id,
    round: m.round,
    stage: m.stageSlug,
    week: weeks[m.stageSlug] ?? null,
    startsAt: m.startsAt?.toISOString() ?? null,
    mine: team,
    opp: m.team1Id === team ? m.team2Id! : m.team1Id!,
    history: hist.get(m.id) ?? [],
    busy: busy.get(m.id) ?? {},
  }));
});

export const waitingOnMe = (m: SchedMatch) => isOpen(weekOf(m.week)) && m.history.some((p) => p.status === "pending" && p.teamId === m.opp);

/** still open, no agreed time, and the match week starts within 14 days */
const soon = (m: SchedMatch, now = Date.now()) => {
  const w = weekOf(m.week);
  return !!w && isOpen(w, now) && !m.startsAt && w.from.getTime() - now <= 14 * 864e5;
};
/** captain: a close match with no time and no proposal from us yet */
export const needsTime = (m: SchedMatch) => soon(m) && !m.history.some((p) => p.status === "pending" && p.teamId === m.mine);
/** any player: a close match and they never saved their availability for it */
export const needsHours = (m: SchedMatch, osuId: number) => soon(m) && !(osuId in m.busy);

// anyone logged in can link from registration on (linking early is fine; team roles only follow once they're on a team)
export const canLinkDiscord = () => discordReady() && !isBGCC6();

// show = scheduling nav item; discord = red dot on "me" + link popup for everyone without a linked discord
export const schedNav = cache(async (osuId: number | null) => {
  if (!osuId) return null;
  const [s, team] = await Promise.all([getSettings(), teamOf(osuId)]);
  const [me] = canLinkDiscord() ? await safe(() => db.select({ discordId: users.discordId }).from(users).where(eq(users.osuId, osuId)).limit(1), []) : [];
  const discord = canLinkDiscord() && !me?.discordId;
  if (!team) return { show: false, dot: false, discord };
  const show = s.phase === "playoffs" && !!(await myTeam(osuId));
  // captains: an answer waits on them, or a close match has no time. everyone: a close match where they never saved their hours
  const [list, cap] = show ? await Promise.all([mySchedule(osuId), myCaptainTeam(osuId)]) : [[], null];
  const dot = list.some((m) => (!!cap && (waitingOnMe(m) || needsTime(m))) || needsHours(m, osuId));
  return { show, dot, discord };
});

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

