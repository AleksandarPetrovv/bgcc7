"use server";

import { resolveAll } from "@/db/pool-sheet";
import { and, arrayContains, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { writeOrder } from "@/db/reorder";
import { resolveOsuUser, saveOsuUser } from "@/db/users";
import { guard } from "@/lib/admin-action";
import { cleanRoles } from "@/lib/roles";
import type { ActionResult } from "@/lib/action-result";
import { relayAccess } from "@/lib/authz";
import { relayKick } from "@/lib/relay";

// a helper whose account lost both helper roles is cut off at once instead of at its next request
const kickIfNoHelperRole = async (osuId: number) => {
  if (!(await relayAccess(osuId)).any) relayKick(osuId);
};

export async function addStaff(_: ActionResult, fd: FormData) {
  return guard("staff", "staff.add", async () => {
    const u = await resolveOsuUser(fd.get("q"));
    if (!u) return { ok: false, error: "notFound" };
    await saveOsuUser(u);
    await db.insert(staff).values({ osuId: u.id }).onConflictDoNothing();
    return { log: { osuId: u.id, username: u.username } };
  });
}

export async function updateStaff(osuId: number, _: ActionResult, fd: FormData) {
  return guard("staff", "staff.update", async () => {
    const permRoles = cleanRoles(fd.getAll("permRoles").map(String));
    if (!permRoles.includes("host") && !(await otherHost(osuId))) return { ok: false, error: "lastHost" };
    await db.update(staff).set({ permRoles }).where(eq(staff.osuId, osuId));
    await resolveAll();
    await kickIfNoHelperRole(osuId);
    return { log: { osuId, permRoles } };
  });
}

export async function reorderStaff(ids: number[]) {
  return guard("staff", "staff.reorder", async () => {
    if (!(await writeOrder(staff, staff.osuId, ids))) return { ok: false, error: "invalid" };
    return { log: { ids } };
  });
}

export async function removeStaff(osuId: number) {
  return guard("staff", "staff.remove", async () => {
    if (!(await otherHost(osuId))) return { ok: false, error: "lastHost" };
    await db.delete(staff).where(eq(staff.osuId, osuId));
    await resolveAll();
    await kickIfNoHelperRole(osuId);
    return { log: { osuId } };
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
