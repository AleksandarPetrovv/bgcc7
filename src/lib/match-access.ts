import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teamMembers, users } from "@/db/schema";
import { getViewer } from "./authz";
import { can } from "./roles";
import { siteRun } from "@/db/site-run";
import { staffNames } from "./staff-names";
import type { Side } from "./draft";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "./format";

/** which matches the viewer may run: hosts all, refs only the ones assigned to them */
export async function refScope() {
  const v = await getViewer();
  if (!v) return null;
  if (v.roles.includes("host")) return { host: true, runs: (() => true) as (referee: string | null) => boolean };
  if (!can(v.roles, "matches")) return null;
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, v.osuId)).limit(1);
  const me = u?.username.toLowerCase();
  return { host: false, runs: (referee: string | null) => !!me && staffNames(referee).some((n) => n.toLowerCase() === me) };
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
