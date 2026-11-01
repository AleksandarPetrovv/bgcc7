import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./index";
import { users } from "./schema";
import { safe } from "./safe";
import { getSettings, type Settings } from "./settings";
import { getMatchRows, getTeams } from "./tournament";
import { canLinkDiscord, captainOf, mySchedule, needsHours, needsTime, waitingOnMe } from "./schedule";
import { getViewer, getVisibility } from "@/lib/authz";
import { isKnockedOut, teamOfPlayer } from "@/lib/alive";
import { windowState } from "@/lib/time";

export const regState = (s: Pick<Settings, "regOpensAt" | "regClosesAt">) => windowState(s.regOpensAt, s.regClosesAt);
/** the register button shows: section on, registration phase, window open */
export const regOpen = (s: Pick<Settings, "phase" | "regOpensAt" | "regClosesAt">, sections: { register: boolean }) => sections.register && s.phase === "registration" && regState(s) === "open";

/** the viewer's users row bits for the connections card; throws on db errors */
export const userLink = cache(async (osuId: number) => (await db.select({ id: users.discordId, name: users.discordName, username: users.username }).from(users).where(eq(users.osuId, osuId)).limit(1))[0] ?? null);

export const getMe = cache(async () => {
  const [v, session] = await Promise.all([getViewer(), auth()]);
  if (!v) return null;
  const [s, vis, teams, rows, link] = await Promise.all([getSettings(), getVisibility(), getTeams(), getMatchRows(), canLinkDiscord() ? safe(() => userLink(v.osuId), null) : null]);
  // teamOf is any team, myTeam only while it's still alive, so scheduling disappears for a knocked out team
  const teamOf = teamOfPlayer(teams, v.osuId)?.id ?? null;
  const myTeam = teamOf && !isKnockedOut(teamOf, rows) ? teamOf : null;
  return {
    osuId: v.osuId,
    roles: v.roles,
    name: session?.user?.name ?? null,
    teamOf,
    myTeam,
    captainOf: teams.find((t) => captainOf(t) === v.osuId)?.id ?? null,
    discordLinked: !!link?.id,
    regState: regState(s),
    regOpen: regOpen(s, vis.sections),
    canSchedule: s.phase === "playoffs" && !!myTeam,
  };
});

// show = scheduling nav item; discord = red dot on "me" + link popup for everyone without a linked discord
export const schedNav = cache(async () => {
  const me = await getMe();
  if (!me) return null;
  const discord = canLinkDiscord() && !me.discordLinked;
  if (!me.teamOf) return { show: false, dot: false, discord };
  const show = me.canSchedule;
  // captains: an answer waits on them, or a close match has no time. everyone: a close match where they never saved their hours
  const list = show ? await mySchedule(me.myTeam) : [];
  const dot = list.some((m) => (!!me.captainOf && (waitingOnMe(m) || needsTime(m))) || needsHours(m, me.osuId));
  return { show, dot, discord };
});
