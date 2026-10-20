import "server-only";
import { cache } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { matches, reschedules, stages, users } from "./schema";
import { safe } from "./safe";
import { getAllTeams, getMatchRows, getTeams, type MatchRow } from "./tournament";
import { getSettings } from "./settings";
import { getFormat } from "./edition";
import { matchSlug } from "@/lib/format";
import { siteUrl } from "@/lib/links";
import { dm, discordReady } from "@/lib/discord";
import { fmtSofia } from "@/lib/time";
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
});

export async function historyOf(ids: string[]) {
  if (!ids.length) return new Map<string, Proposal[]>();
  const rows = await db.select().from(reschedules).where(inArray(reschedules.matchId, ids)).orderBy(desc(reschedules.createdAt), desc(reschedules.id));
  const out = new Map<string, Proposal[]>();
  for (const r of rows) out.set(r.matchId, [...(out.get(r.matchId) ?? []), toProposal(r)]);
  return out;
}

export const mySchedule = cache(async (osuId: number): Promise<SchedMatch[]> => {
  const team = await myCaptainTeam(osuId);
  if (!team) return [];
  const [rows, weeks] = await Promise.all([getMatchRows(), stageWeeks()]);
  const mine = rows.filter((m) => schedulable(m) && (m.team1Id === team || m.team2Id === team));
  const hist = await safe(() => historyOf(mine.map((m) => m.id)), new Map<string, Proposal[]>());
  const f = getFormat();
  return mine.map((m) => ({
    id: m.id,
    slug: matchSlug(f, m.id),
    round: m.round,
    stage: m.stageSlug,
    week: weeks[m.stageSlug] ?? null,
    startsAt: m.startsAt?.toISOString() ?? null,
    mine: team,
    opp: m.team1Id === team ? m.team2Id! : m.team1Id!,
    history: hist.get(m.id) ?? [],
  }));
});

export const waitingOnMe = (m: SchedMatch) => isOpen(weekOf(m.week)) && m.history.some((p) => p.status === "pending" && p.teamId === m.opp);

export const schedNav = cache(async (osuId: number | null) => {
  if (!osuId) return null;
  const s = await getSettings();
  if (s.phase !== "playoffs") return null;
  const team = await myCaptainTeam(osuId);
  if (!team) return null;
  const list = await mySchedule(osuId);
  const [me] = await safe(() => db.select({ discordId: users.discordId }).from(users).where(eq(users.osuId, osuId)).limit(1), []);
  return { dot: list.some(waitingOnMe), discord: discordReady() && !me?.discordId };
});

export async function lockMatch(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string) {
  const [m] = await tx.select().from(matches).where(eq(matches.id, id)).for("update").limit(1);
  return m ?? null;
}

export const staffOverride = (tx: Pick<typeof db, "update">, matchId: string, by: number | null, only: ("pending" | "accepted")[] = ["pending", "accepted"]) =>
  tx.update(reschedules).set({ status: "cancelled", decidedBy: by }).where(and(eq(reschedules.matchId, matchId), inArray(reschedules.status, only)));

export const pendingOf = (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id: string) =>
  tx.select().from(reschedules).where(and(eq(reschedules.matchId, id), eq(reschedules.status, "pending")));

export async function notifyCaptain(teamId: string, text: (link: string) => string) {
  if (!discordReady()) return;
  const t = (await getAllTeams()).find((x) => x.id === teamId);
  const cap = captainOf(t);
  if (!cap) return;
  const [u] = await db.select({ discordId: users.discordId }).from(users).where(eq(users.osuId, cap)).limit(1);
  if (!u?.discordId) return;
  await dm(u.discordId, text(`${siteUrl()}/scheduling`)).catch((e) => console.error("[discord] dm", e));
}

export const fmtAt = (d: Date) => `${fmtSofia(d, "en-GB")} (BG time)`;
