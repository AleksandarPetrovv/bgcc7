"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lobbies, lobbyBookings, registrations } from "@/db/schema";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";
import { fromSofiaInput } from "@/lib/time";

function parse(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim().slice(0, 40);
  const startsAt = fromSofiaInput(String(fd.get("startsAt") ?? ""));
  const capacity = Math.round(Number(fd.get("capacity")));
  const referee = String(fd.get("referee") ?? "").trim().slice(0, 60) || null;
  const mpLinks = (String(fd.get("mpLinks") ?? "").match(/\d{6,}/g) ?? []).join(",");
  if (!name || !startsAt || !Number.isInteger(capacity) || capacity < 1 || capacity > 32) return null;
  return { name, startsAt, capacity, referee, mpLinks };
}

export async function createLobby(_: ActionResult, fd: FormData) {
  return guard("lobbies", "lobby.create", async () => {
    const v = parse(fd);
    if (!v) return { ok: false, error: "invalid" };
    await db.insert(lobbies).values(v);
    return v;
  });
}

export async function updateLobby(id: number, _: ActionResult, fd: FormData) {
  return guard("lobbies", "lobby.update", async () => {
    const v = parse(fd);
    if (!v) return { ok: false, error: "invalid" };
    await db.update(lobbies).set(v).where(eq(lobbies.id, id));
    return { id, ...v };
  });
}

export async function deleteLobby(id: number) {
  return guard("lobbies", "lobby.delete", async () => {
    await db.delete(lobbies).where(eq(lobbies.id, id));
    return { id };
  });
}

export async function placePlayer(_: ActionResult, fd: FormData) {
  return guard("lobbies", "lobby.place", async () => {
    const osuId = Number(fd.get("osuId"));
    const lobbyId = Number(fd.get("lobbyId"));
    if (!Number.isInteger(osuId) || !Number.isInteger(lobbyId)) return { ok: false, error: "invalid" };
    const [reg] = await db.select({ osuId: registrations.osuId }).from(registrations).where(eq(registrations.osuId, osuId)).limit(1);
    if (!reg) return { ok: false, error: "notFound" };
    await db
      .insert(lobbyBookings)
      .values({ osuId, lobbyId })
      .onConflictDoUpdate({ target: lobbyBookings.osuId, set: { lobbyId, bookedAt: new Date() } });
    return { osuId, lobbyId };
  });
}

export async function unbook(osuId: number) {
  return guard("lobbies", "lobby.unbook", async () => {
    await db.delete(lobbyBookings).where(eq(lobbyBookings.osuId, osuId));
    return { osuId };
  });
}
