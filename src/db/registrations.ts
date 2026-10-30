import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { lobbyBookings, registrations, settings, users } from "./schema";
import { safe } from "./safe";
import { refreshUsers } from "./users";
import { getSettings, saveSettings } from "./settings";
import { avatarCol } from "./avatar";

export const STATUSES = ["pending", "approved", "denied"] as const;
export type Status = (typeof STATUSES)[number];
export const isStatus = (v: unknown): v is Status => typeof v === "string" && (STATUSES as readonly string[]).includes(v);

export type RegRow = {
  osuId: number;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  rank: number | null;
  countryRank: number | null;
  pp: number | null;
  accuracy: number | null;
  badges: number | null;
  badgeOverride: number | null;
  status: Status;
  note: string | null;
  createdAt: Date;
  seeded: boolean;
};

export const getBwsLock = () =>
  safe(async () => {
    const [row] = await db.select({ at: settings.bwsLockedAt }).from(settings).where(eq(settings.id, 1)).limit(1);
    return row?.at ?? null;
  }, null as Date | null);

export const getRegistrations = () =>
  safe(async () => {
    const [rows, locked] = await Promise.all([
      db
        .select({
          osuId: users.osuId,
          username: users.username,
          avatarUrl: avatarCol,
          country: users.country,
          rank: users.rank,
          countryRank: users.countryRank,
          pp: users.pp,
          accuracy: users.accuracy,
          badges: users.badges,
          badgeOverride: users.badgeOverride,
          rankLock: registrations.rankLock,
          badgesLock: registrations.badgesLock,
          status: registrations.status,
          note: registrations.note,
          createdAt: registrations.createdAt,
          seeded: users.seeded,
        })
        .from(registrations)
        .innerJoin(users, eq(users.osuId, registrations.osuId))
        .orderBy(desc(users.pp)),
      getBwsLock(),
    ]);
    return rows.map(({ rankLock, badgesLock, ...r }) => ({
      ...r,
      ...(locked ? { rank: rankLock, badges: badgesLock } : {}),
      status: isStatus(r.status) ? r.status : "pending",
    })) as RegRow[];
  }, [] as RegRow[]);

export const getRegistration = (osuId: number) =>
  safe(async () => {
    const [row] = await db.select({ status: registrations.status }).from(registrations).where(eq(registrations.osuId, osuId)).limit(1);
    return row ? (isStatus(row.status) ? row.status : "pending") : null;
  }, null as Status | null);

/** copies the players' current rank and badges into their registration, so later osu! changes don't move seeds */
/** a registration's status changes; anyone not approved also loses their qualifier lobby booking */
export async function setRegistrationStatus(osuId: number, status: Status, note: string | null, by: number) {
  await db
    .update(registrations)
    .set({ status, note, decidedBy: status === "pending" ? null : by, decidedAt: status === "pending" ? null : new Date() })
    .where(eq(registrations.osuId, osuId));
  if (status !== "approved") await db.delete(lobbyBookings).where(eq(lobbyBookings.osuId, osuId));
}

export async function removeRegistration(osuId: number) {
  await db.delete(registrations).where(eq(registrations.osuId, osuId));
  await db.delete(lobbyBookings).where(eq(lobbyBookings.osuId, osuId));
}

export const snapshotBws = (osuId?: number) =>
  db.execute(sql`update registrations r set rank_lock = u.rank, badges_lock = u.badges from users u where u.osu_id = r.osu_id ${osuId == null ? sql`` : sql`and r.osu_id = ${osuId}`}`);

export async function lockBws() {
  const ids = (await db.select({ osuId: registrations.osuId }).from(registrations)).map((r) => r.osuId);
  await refreshUsers(ids);
  await snapshotBws();
  await saveSettings(await getSettings());
  await db.update(settings).set({ bwsLockedAt: new Date() }).where(eq(settings.id, 1));
  return ids.length;
}

export async function unlockBws() {
  await db.update(registrations).set({ rankLock: null, badgesLock: null });
  await db.update(settings).set({ bwsLockedAt: null }).where(eq(settings.id, 1));
}
