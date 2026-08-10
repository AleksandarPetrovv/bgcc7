"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { lobbies, maps, matchCache, matches, qualScores, registrations, sponsors, teams, users } from "@/db/schema";
import { saveSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import { requireRole } from "@/lib/authz";
import type { ActionResult } from "@/lib/roles";
import { LINK_KEYS } from "@/lib/sections";

const url = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().slice(0, 500);
  return /^https:\/\/\S+$/.test(s) ? s : "";
};

export async function saveLinks(_: ActionResult, fd: FormData) {
  return guard("phase", "site.links", async () => {
    const links = Object.fromEntries(LINK_KEYS.map((k) => [k, url(fd.get(k))]).filter(([, v]) => v));
    await saveSettings({ links });
    return links;
  });
}

export async function addSponsor(_: ActionResult, fd: FormData) {
  return guard("phase", "sponsor.add", async () => {
    const name = String(fd.get("name") ?? "").trim().slice(0, 60);
    if (!name) return { ok: false, error: "invalid" };
    const all = await db.select({ id: sponsors.id }).from(sponsors);
    const row = { name, image: url(fd.get("image")), url: url(fd.get("url")) || null, order: all.length };
    await db.insert(sponsors).values(row);
    return row;
  });
}

export async function updateSponsor(id: number, _: ActionResult, fd: FormData) {
  return guard("phase", "sponsor.update", async () => {
    const name = String(fd.get("name") ?? "").trim().slice(0, 60);
    const order = Math.max(0, Math.min(999, Math.round(Number(fd.get("order")) || 0)));
    if (!name) return { ok: false, error: "invalid" };
    const row = { name, image: url(fd.get("image")), url: url(fd.get("url")) || null, order };
    await db.update(sponsors).set(row).where(eq(sponsors.id, id));
    return { id, ...row };
  });
}

export async function deleteSponsor(id: number) {
  return guard("phase", "sponsor.delete", async () => {
    await db.delete(sponsors).where(eq(sponsors.id, id));
    return { id };
  });
}

export async function wipeTestData() {
  return guard("phase", "site.wipeTestData", async () => {
    const v = await requireRole("staff");
    if (v.role !== "host") return { ok: false, error: "forbidden" };
    const seededUsers = (await db.select({ id: users.osuId }).from(users).where(eq(users.seeded, true))).map((u) => u.id);
    await db.transaction(async (tx) => {
      await tx.delete(qualScores).where(eq(qualScores.seeded, true));
      await tx.delete(lobbies).where(eq(lobbies.seeded, true));
      await tx.delete(maps).where(eq(maps.seeded, true));
      await tx.delete(teams).where(eq(teams.seeded, true));
      await tx.delete(sponsors).where(eq(sponsors.seeded, true));
      if (seededUsers.length) {
        await tx.delete(registrations).where(inArray(registrations.osuId, seededUsers));
        await tx.delete(users).where(inArray(users.osuId, seededUsers));
      }
      await tx.update(matches).set({
        team1Id: null,
        team2Id: null,
        score1: null,
        score2: null,
        winner: null,
        startsAt: null,
        mpLinks: "",
        referee: null,
        streamer: null,
        commentators: null,
        vodUrl: null,
        manual: false,
      });
      await tx.delete(matchCache);
    });
    return { users: seededUsers.length };
  });
}
