import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./index";
import { registrations, users } from "./schema";
import { safe } from "./safe";
import { getSettings, type Settings } from "./settings";
import { getMatchRows, getTeams } from "./tournament";
import { canLinkDiscord, captainOf, mySchedule, needsHours, needsTime, waitingOnMe } from "./schedule";
import { getViewer, getVisibility } from "@/lib/authz";
import { isAlive, teamOfPlayer } from "@/lib/alive";
import { windowState } from "@/lib/time";
import { owedPick } from "./team-requests";
import { noDuties } from "@/lib/roles";

export const regState = (s: Pick<Settings, "regOpensAt" | "regClosesAt">) => windowState(s.regOpensAt, s.regClosesAt);
export const regOpen = (s: Pick<Settings, "phase" | "regOpensAt" | "regClosesAt">, sections: { register: boolean }) => sections.register && s.phase === "registration" && regState(s) === "open";

export const userLink = cache(async (osuId: number) => (await db.select({ id: users.discordId, name: users.discordName, username: users.username }).from(users).where(eq(users.osuId, osuId)).limit(1))[0] ?? null);

export const getMe = cache(async () => {
  const [v, session] = await Promise.all([getViewer(), auth()]);
  if (!v) return null;
  const [s, vis, teams, rows, link, reg] = await Promise.all([
    getSettings(),
    getVisibility(),
    getTeams(),
    getMatchRows(),
    canLinkDiscord() ? safe(() => userLink(v.osuId), null) : null,
    safe(() => db.select({ id: registrations.osuId }).from(registrations).where(eq(registrations.osuId, v.osuId)).limit(1), []),
  ]);
  // teamOf is any team, myTeam only while it's still alive, so scheduling disappears for a knocked out team
  const team = teamOfPlayer(teams, v.osuId);
  const teamOf = team?.id ?? null;
  const myTeam = team && isAlive(team, rows) ? team.id : null;
  return {
    osuId: v.osuId,
    roles: v.roles,
    name: session?.user?.name ?? null,
    teamOf,
    myTeam,
    captainOf: teams.find((t) => captainOf(t) === v.osuId)?.id ?? null,
    // /me is for people in the tournament: players, and staff with something to do on the site
    noPage: v.roles.every(noDuties) && !team && !reg.length,
    discordLinked: !!link?.id,
    regState: regState(s),
    regOpen: regOpen(s, vis.sections),
    canSchedule: s.phase === "playoffs" && !!myTeam,
  };
});

export const schedNav = cache(async () => {
  const me = await getMe();
  if (!me) return null;
  const discord = canLinkDiscord() && !me.discordLinked;
  const team = !!me.captainOf && !!(await owedPick(me.osuId).catch(() => null));
  if (!me.teamOf) return { show: false, dot: false, discord, team };
  const show = me.canSchedule;
  const list = show ? await mySchedule(me.myTeam) : [];
  const dot = list.some((m) => (!!me.captainOf && (waitingOnMe(m) || needsTime(m))) || needsHours(m, me.osuId));
  return { show, dot, discord, team };
});
