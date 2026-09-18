"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staff, users } from "@/db/schema";
import { guard } from "@/lib/admin-action";
import { getUser } from "@/lib/osu-api";
import { isRole, STAFF_ROLES, type ActionResult } from "@/lib/roles";

export async function addStaff(_: ActionResult, fd: FormData) {
  return guard("staff", "staff.add", async () => {
    const q = String(fd.get("q") ?? "").trim();
    if (!q || q.length > 32) return { ok: false, error: "invalid" };
    const u = await getUser(q);
    if (!u) return { ok: false, error: "notFound" };
    const row = { username: u.username, avatarUrl: u.avatar_url, country: u.country_code, updatedAt: new Date() };
    await db.insert(users).values({ osuId: u.id, ...row }).onConflictDoUpdate({ target: users.osuId, set: row });
    await db.insert(staff).values({ osuId: u.id }).onConflictDoNothing();
    return { osuId: u.id, username: u.username };
  });
}

export async function updateStaff(osuId: number, _: ActionResult, fd: FormData) {
  return guard("staff", "staff.update", async () => {
    const perm = String(fd.get("permRole") ?? "");
    const permRole = isRole(perm) ? perm : null;
    const displayRoles = fd.getAll("displayRoles").map(String).filter((r) => STAFF_ROLES.includes(r));
    await db.update(staff).set({ permRole, displayRoles }).where(eq(staff.osuId, osuId));
    return { osuId, permRole, displayRoles };
  });
}

export async function reorderStaff(ids: number[]) {
  return guard("staff", "staff.reorder", async () => {
    if (!Array.isArray(ids) || !ids.every((i) => Number.isInteger(i))) return { ok: false, error: "invalid" };
    for (const [order, osuId] of ids.entries()) await db.update(staff).set({ order }).where(eq(staff.osuId, osuId));
    return { ids };
  });
}

export async function removeStaff(osuId: number) {
  return guard("staff", "staff.remove", async () => {
    await db.delete(staff).where(eq(staff.osuId, osuId));
    return { osuId };
  });
}
