import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, mpLobbies, teamMembers } from "@/db/schema";
import { staffIds } from "@/db/users";
import { getViewer } from "./authz";
import { can } from "./roles";
import { relayOnline } from "./relay";
import { staffNames } from "./staff-names";
import type { Side } from "./draft";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "./format";

/** who runs the match: its referees, whether one of them is live (helper online or owning the open lobby), and whether it is played through the site */
export async function siteRun(m: { id: string; referee: string | null }) {
  const refs = await staffIds(m.referee);
  const [lob] = await db.select({ owner: mpLobbies.owner, open: mpLobbies.open }).from(mpLobbies).where(eq(mpLobbies.matchId, m.id)).limit(1);
  const refLive = refs.some((ref) => relayOnline(ref) || (!!lob?.open && lob.owner === String(ref)));
  return { refs, refLive, onSite: refLive || !!lob };
}

/** hosts run any match, a referee only the ones assigned to them (and, with `unassigned`, ones nobody has yet) */
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

/** a match url's id and what the viewer may do there (null = nothing) */
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
