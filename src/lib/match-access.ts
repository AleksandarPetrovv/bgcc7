import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, mpLobbies, teamMembers, users } from "@/db/schema";
import { staffIds } from "@/db/users";
import { getViewer } from "./authz";
import { can } from "./roles";
import { offlineFor } from "./relay";
import { siteRun } from "@/db/site-run";
import { staffNames } from "./staff-names";
import type { Side } from "./draft";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "./format";

/** which matches the viewer may run: hosts all, refs only the ones assigned to them */
export async function refScope() {
  const v = await getViewer();
  if (!v) return null;
  const host = v.roles.includes("host");
  if (!host && !can(v.roles, "matches")) return null;
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, v.osuId)).limit(1);
  const me = u?.username.toLowerCase();
  /** the viewer is named as this match's referee */
  const mine = (referee: string | null) => !!me && staffNames(referee).some((n) => n.toLowerCase() === me);
  return { host, mine, runs: host ? () => true : mine };
}

const HELPER_GONE = 5 * 60_000;
const STARTS_SOON = 30 * 60_000;

/** what the viewer may do about a refereeless or abandoned match: take it (no referee) or take it over (every named referee's helper gone); null = nothing */
export async function takeOver(q: Pick<typeof db, "select">, m: Pick<typeof matches.$inferSelect, "id" | "referee" | "winner" | "startsAt">) {
  const v = await getViewer();
  if (!v || m.winner != null || !v.roles.includes("referee") || v.roles.includes("host")) return null;
  const [me] = await q.select({ username: users.username }).from(users).where(eq(users.osuId, v.osuId)).limit(1);
  const named = staffNames(m.referee);
  if (!me || named.some((n) => n.toLowerCase() === me.username.toLowerCase())) return null;
  const [lobby] = await q.select({ owner: mpLobbies.owner }).from(mpLobbies).where(and(eq(mpLobbies.matchId, m.id), eq(mpLobbies.open, true))).limit(1);
  const out = { username: me.username, lobby: !!lobby };
  if (!named.length) return { kind: "take" as const, ...out };
  const ids = await staffIds(m.referee);
  if (!ids.every((id) => (offlineFor(id) ?? 0) >= HELPER_GONE)) return null;
  const needed = (lobby && ids.includes(Number(lobby.owner))) || (m.startsAt && m.startsAt.getTime() <= Date.now() + STARTS_SOON);
  return needed ? { kind: "over" as const, ...out } : null;
}

export async function canRunMatch(matchId: string) {
  const s = await refScope();
  if (!s) return false;
  if (s.host) return true;
  const [m] = await db.select({ referee: matches.referee }).from(matches).where(eq(matches.id, matchId)).limit(1);
  return !!m && s.runs(m.referee);
}

export async function withMatch(slug: string) {
  const id = matchIdFromSlug(getFormat(), slug);
  return { id, access: await draftAccess(id) };
}

export async function draftAccess(matchId: string) {
  const v = await getViewer();
  if (!v) return null;
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!m) return null;
  const staff = can(v.roles, "matches");
  const { refs, onSite } = await siteRun(m);
  const host = v.roles.includes("host");
  // hosts run every lobby and draft, refs only the ones they're named on
  const admin = staff && (host || refs.includes(v.osuId));
  const [mem] = await db.select({ teamId: teamMembers.teamId, isCaptain: teamMembers.isCaptain }).from(teamMembers).where(eq(teamMembers.osuId, v.osuId)).limit(1);
  const team: Side | null = mem && mem.teamId === m.team1Id ? 1 : mem && mem.teamId === m.team2Id ? 2 : null;
  const side = team && mem?.isCaptain ? team : null;
  if (!staff && !(team && onSite)) return null;
  const streams = host || (v.roles.includes("referee") && v.roles.includes("streamer"));
  return { osuId: v.osuId, admin, staff, streams, side, team, match: m };
}
