"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { lobbies, maps, matchCache, matches, qualScores, registrations, sponsors, teams, users } from "@/db/schema";
import { guard } from "@/lib/admin-action";
import { requireRole } from "@/lib/authz";
import { getUser } from "@/lib/osu-api";
import type { ActionResult } from "@/lib/roles";

const osuQuery = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().slice(0, 200);
  const m = /osu\.ppy\.sh\/(?:users|u)\/([^/?#\s]+)/i.exec(s);
  return decodeURIComponent(m ? m[1] : s);
};

async function sponsorFrom(fd: FormData) {
  const q = osuQuery(fd.get("q"));
  if (!q || q.length > 40) return null;
  const u = await getUser(q);
  if (!u) return null;
  return { osuId: u.id, name: u.username, image: u.avatar_url, url: `https://osu.ppy.sh/users/${u.id}` };
}

export async function addSponsor(_: ActionResult, fd: FormData) {
  return guard("phase", "sponsor.add", async () => {
    const row = await sponsorFrom(fd);
    if (!row) return { ok: false, error: "notFound" };
    const all = await db.select({ id: sponsors.id }).from(sponsors);
    await db.insert(sponsors).values({ ...row, order: all.length });
    return { name: row.name };
  });
}

export async function updateSponsor(id: number, _: ActionResult, fd: FormData) {
  return guard("phase", "sponsor.update", async () => {
    const row = await sponsorFrom(fd);
    if (!row) return { ok: false, error: "notFound" };
    const [old] = await db.select({ name: sponsors.name }).from(sponsors).where(eq(sponsors.id, id)).limit(1);
    await db.update(sponsors).set(row).where(eq(sponsors.id, id));
    return { from: old?.name ?? null, name: row.name };
  });
}

export async function reorderSponsors(ids: number[]) {
  return guard("phase", "sponsor.reorder", async () => {
    if (!Array.isArray(ids) || !ids.every((i) => Number.isInteger(i))) return { ok: false, error: "invalid" };
    for (const [order, id] of ids.entries()) await db.update(sponsors).set({ order }).where(eq(sponsors.id, id));
    const rows = await db.select({ name: sponsors.name }).from(sponsors).orderBy(asc(sponsors.order));
    return { names: rows.map((r) => r.name) };
  });
}

export async function deleteSponsor(id: number) {
  return guard("phase", "sponsor.delete", async () => {
    const [row] = await db.delete(sponsors).where(eq(sponsors.id, id)).returning({ name: sponsors.name });
    return { name: row?.name ?? null };
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
