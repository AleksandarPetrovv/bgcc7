import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { lobbies, lobbyBookings, users } from "./schema";
import { safe } from "./safe";

export type LobbyPlayer = { osuId: number; username: string; avatarUrl: string | null; country: string | null };
export type Lobby = { id: number; name: string; startsAt: Date; capacity: number; referee: string | null; mpLinks: string; players: LobbyPlayer[] };

export const getLobbies = () =>
  safe(async () => {
    const [rows, booked] = await Promise.all([
      db.select().from(lobbies).orderBy(asc(lobbies.startsAt), asc(lobbies.name)),
      db
        .select({ lobbyId: lobbyBookings.lobbyId, osuId: users.osuId, username: users.username, avatarUrl: users.avatarUrl, country: users.country })
        .from(lobbyBookings)
        .innerJoin(users, eq(users.osuId, lobbyBookings.osuId))
        .orderBy(asc(lobbyBookings.bookedAt)),
    ]);
    return rows.map(
      (l): Lobby => ({
        id: l.id,
        name: l.name,
        startsAt: l.startsAt,
        capacity: l.capacity,
        referee: l.referee,
        mpLinks: l.mpLinks,
        players: booked.filter((b) => b.lobbyId === l.id).map((b) => ({ osuId: b.osuId, username: b.username, avatarUrl: b.avatarUrl, country: b.country })),
      }),
    );
  }, [] as Lobby[]);

export const getBooking = (osuId: number) =>
  safe(async () => {
    const [row] = await db.select({ lobbyId: lobbyBookings.lobbyId }).from(lobbyBookings).where(eq(lobbyBookings.osuId, osuId)).limit(1);
    return row?.lobbyId ?? null;
  }, null as number | null);

export const mpIds = (links: string) => links.match(/\d{6,}/g) ?? [];
