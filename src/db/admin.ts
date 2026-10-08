import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { adminLog, lobbies, maps, matches, stages, staff, teams, users } from "./schema";
import type { LogCtx } from "@/lib/log-text";
import { safe } from "./safe";

export type LogRow = { id: number; action: string; payload: unknown; at: Date; username: string | null; avatarUrl: string | null; osuId: number };

export const getLog = (limit = 200, osuId?: number) =>
  safe(
    () =>
      db
        .select({
          id: adminLog.id,
          action: adminLog.action,
          payload: adminLog.payload,
          at: adminLog.at,
          username: users.username,
          avatarUrl: users.avatarUrl,
          osuId: adminLog.osuId,
        })
        .from(adminLog)
        .leftJoin(users, eq(users.osuId, adminLog.osuId))
        .where(osuId === undefined ? undefined : eq(adminLog.osuId, osuId))
        .orderBy(desc(adminLog.id))
        .limit(limit),
    [] as LogRow[],
  );

export type StaffRow = {
  osuId: number;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  permRoles: string[];
  order: number;
};

export const getStaff = () =>
  safe(
    () =>
      db
        .select({
          osuId: staff.osuId,
          username: users.username,
          avatarUrl: users.avatarUrl,
          country: users.country,
          permRoles: staff.permRoles,
          order: staff.order,
        })
        .from(staff)
        .innerJoin(users, eq(users.osuId, staff.osuId))
        .orderBy(asc(staff.order), asc(users.username)),
    [] as StaffRow[],
  );

export const getPublicStaff = async () => (await getStaff()).filter((s) => s.osuId > 0 && s.permRoles.length > 0);

export const getLogCtx = () =>
  safe(
    async (): Promise<LogCtx> => {
      const [us, ls, ts, ss, ms, mt] = await Promise.all([
        db.select({ id: users.osuId, name: users.username }).from(users),
        db.select({ id: lobbies.id, name: lobbies.name }).from(lobbies),
        db.select({ id: teams.id, name: teams.name }).from(teams),
        db.select({ id: stages.id, title: stages.title }).from(stages),
        db.select({ id: maps.id, beatmapId: maps.beatmapId, title: maps.title, version: maps.version }).from(maps),
        db.select({ id: matches.id, a: matches.team1Id, b: matches.team2Id }).from(matches),
      ]);
      const team = new Map(ts.map((t) => [t.id, t.name]));
      return {
        user: new Map(us.map((u) => [u.id, u.name])),
        lobby: new Map(ls.map((l) => [l.id, l.name])),
        team,
        stage: new Map(ss.map((x) => [x.id, x.title])),
        map: new Map(ms.map((m) => [m.id, `${m.title} [${m.version}]`])),
        beatmap: new Map(ms.map((m) => [m.beatmapId, `${m.title} [${m.version}]`])),
        match: new Map(mt.map((m) => [m.id, [m.a ? (team.get(m.a) ?? null) : null, m.b ? (team.get(m.b) ?? null) : null]])),
      };
    },
    { user: new Map(), lobby: new Map(), team: new Map(), stage: new Map(), map: new Map(), beatmap: new Map(), match: new Map() },
  );
