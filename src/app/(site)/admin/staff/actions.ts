"use server";

import { and, arrayContains, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { resolveOsuUser, saveOsuUser } from "@/db/users";
import { guard } from "@/lib/admin-action";
import { cleanRoles, type ActionResult } from "@/lib/roles";
import { relayPerms } from "@/lib/relay-perms";
import { relayKick } from "@/lib/relay";

export async function addStaff(_: ActionResult, fd: FormData) {
  return guard("staff", "staff.add", async () => {
    const u = await resolveOsuUser(fd.get("q"));
    if (!u) return { ok: false, error: "notFound" };
    await saveOsuUser(u);
    await db.insert(staff).values({ osuId: u.id }).onConflictDoNothing();
    return { osuId: u.id, username: u.username };
  });
}

export async function updateStaff(osuId: number, _: ActionResult, fd: FormData) {
  return guard("staff", "staff.update", async () => {
    const permRoles = cleanRoles(fd.getAll("permRoles").map(String));
    if (!permRoles.includes("host") && !(await otherHost(osuId))) return { ok: false, error: "lastHost" };
    await db.update(staff).set({ permRoles }).where(eq(staff.osuId, osuId));
    const p = await relayPerms(osuId);
    if (!p.ref && !p.stream) relayKick(osuId);
    return { osuId, permRoles };
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
    if (!(await otherHost(osuId))) return { ok: false, error: "lastHost" };
    await db.delete(staff).where(eq(staff.osuId, osuId));
    const p = await relayPerms(osuId);
    if (!p.ref && !p.stream) relayKick(osuId);
    return { osuId };
  });
}

async function otherHost(osuId: number) {
  const [row] = await db
    .select({ id: staff.osuId })
    .from(staff)
    .where(and(ne(staff.osuId, osuId), arrayContains(staff.permRoles, ["host"])))
    .limit(1);
  return !!row;
}
