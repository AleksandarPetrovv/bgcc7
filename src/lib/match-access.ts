import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teamMembers } from "@/db/schema";
import { staffIds } from "@/db/users";
import { getViewer } from "./authz";
import { can } from "./roles";
import { siteRun } from "@/db/site-run";
import { staffNames } from "./staff-names";
import type { Side } from "./draft";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "./format";

export async function canRunMatch(matchId: string, opts: { unassigned?: boolean } = {}) {
  const v = await getViewer();
  if (!v) return false;
  if (v.roles.includes("host")) return true;
  if (!can(v.roles, "matches")) return false;
  const [m] = await db.select({ referee: matches.referee }).from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!m) return false;
  if (!staffNames(m.referee).length) return !!opts.unassigned;
  return (await staffIds(m.referee)).includes(v.osuId);
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
  const admin = staff && refs.includes(v.osuId);
  const [mem] = await db.select({ teamId: teamMembers.teamId, isCaptain: teamMembers.isCaptain }).from(teamMembers).where(eq(teamMembers.osuId, v.osuId)).limit(1);
  const team: Side | null = mem && mem.teamId === m.team1Id ? 1 : mem && mem.teamId === m.team2Id ? 2 : null;
  const side = team && mem?.isCaptain ? team : null;
  if (!staff && !(team && onSite)) return null;
  const streams = !!v.roles?.includes("host") || (!!v.roles?.includes("referee") && !!v.roles?.includes("streamer"));
  // hosts answer timeout requests too, not only the assigned ref
  const runs = admin || !!v.roles?.includes("host");
  return { osuId: v.osuId, admin, runs, staff, streams, side, team, match: m };
}
