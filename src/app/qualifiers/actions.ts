"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentOsuId } from "@/auth";
import { db } from "@/db";
import { lobbies, lobbyBookings, registrations } from "@/db/schema";
import { getSettings } from "@/db/settings";
import { windowState } from "@/lib/time";

type Res = { ok: true } | { ok: false; error: "auth" | "approved" | "closed" | "full" | "error" };

async function allowed(): Promise<{ osuId: number } | Res> {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false, error: "auth" };
  const s = await getSettings();
  if (!s.sections.lobbies || windowState(s.bookingOpensAt, s.bookingClosesAt) !== "open") return { ok: false, error: "closed" };
  const [reg] = await db.select({ status: registrations.status }).from(registrations).where(eq(registrations.osuId, osuId)).limit(1);
  if (reg?.status !== "approved") return { ok: false, error: "approved" };
  return { osuId };
}

export async function bookLobby(lobbyId: number): Promise<Res> {
  const who = await allowed();
  if ("ok" in who) return who;
  const res = await db
    .transaction(async (tx) => {
      const [lobby] = await tx.select({ capacity: lobbies.capacity }).from(lobbies).where(eq(lobbies.id, lobbyId)).for("update");
      if (!lobby) return "error" as const;
      const [{ n }] = await tx
        .select({ n: count() })
        .from(lobbyBookings)
        .where(and(eq(lobbyBookings.lobbyId, lobbyId), ne(lobbyBookings.osuId, who.osuId)));
      if (n >= lobby.capacity) return "full" as const;
      await tx
        .insert(lobbyBookings)
        .values({ osuId: who.osuId, lobbyId })
        .onConflictDoUpdate({ target: lobbyBookings.osuId, set: { lobbyId, bookedAt: new Date() } });
      return null;
    })
    .catch((e) => {
      console.error("[book]", e);
      return "error" as const;
    });
  revalidatePath("/", "layout");
  return res ? { ok: false, error: res } : { ok: true };
}

export async function leaveLobby(): Promise<Res> {
  const who = await allowed();
  if ("ok" in who) return who;
  await db.delete(lobbyBookings).where(eq(lobbyBookings.osuId, who.osuId));
  revalidatePath("/", "layout");
  return { ok: true };
}
