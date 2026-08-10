import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { adminLog, staff, users } from "./schema";
import { safe } from "./safe";

export type LogRow = { id: number; action: string; payload: unknown; at: Date; username: string | null; osuId: number };

export const getLog = (limit = 200) =>
  safe(
    () =>
      db
        .select({ id: adminLog.id, action: adminLog.action, payload: adminLog.payload, at: adminLog.at, username: users.username, osuId: adminLog.osuId })
        .from(adminLog)
        .leftJoin(users, eq(users.osuId, adminLog.osuId))
        .orderBy(desc(adminLog.id))
        .limit(limit),
    [] as LogRow[],
  );

export type StaffRow = {
  osuId: number;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  permRole: string | null;
  displayRoles: string[];
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
          permRole: staff.permRole,
          displayRoles: staff.displayRoles,
          order: staff.order,
        })
        .from(staff)
        .innerJoin(users, eq(users.osuId, staff.osuId))
        .orderBy(asc(staff.order), asc(users.username)),
    [] as StaffRow[],
  );

export const getPublicStaff = async () => (await getStaff()).filter((s) => s.displayRoles.length > 0);


