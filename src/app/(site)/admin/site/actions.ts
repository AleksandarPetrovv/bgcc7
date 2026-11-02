"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sponsors } from "@/db/schema";
import { writeOrder } from "@/db/reorder";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";
import { osuUser } from "@/lib/links";
import { resolveOsuUser } from "@/db/users";

async function sponsorFrom(fd: FormData) {
  const u = await resolveOsuUser(fd.get("q"));
  if (!u) return null;
  return { osuId: u.id, name: u.username, image: u.avatar_url, url: osuUser(u.id) };
}

export async function addSponsor(_: ActionResult, fd: FormData) {
  return guard("host", "sponsor.add", async () => {
    const row = await sponsorFrom(fd);
    if (!row) return { ok: false, error: "notFound" };
    const all = await db.select({ id: sponsors.id }).from(sponsors);
    await db.insert(sponsors).values({ ...row, order: all.length });
    return { log: { name: row.name } };
  });
}

export async function updateSponsor(id: number, _: ActionResult, fd: FormData) {
  return guard("host", "sponsor.update", async () => {
    const row = await sponsorFrom(fd);
    if (!row) return { ok: false, error: "notFound" };
    const [old] = await db.select({ name: sponsors.name }).from(sponsors).where(eq(sponsors.id, id)).limit(1);
    await db.update(sponsors).set(row).where(eq(sponsors.id, id));
    return { log: { from: old?.name ?? null, name: row.name } };
  });
}

export async function reorderSponsors(ids: number[]) {
  return guard("host", "sponsor.reorder", async () => {
    if (!(await writeOrder(sponsors, sponsors.id, ids))) return { ok: false, error: "invalid" };
    const rows = await db.select({ name: sponsors.name }).from(sponsors).orderBy(asc(sponsors.order));
    return { log: { names: rows.map((r) => r.name) } };
  });
}

export async function deleteSponsor(id: number) {
  return guard("host", "sponsor.delete", async () => {
    const [row] = await db.delete(sponsors).where(eq(sponsors.id, id)).returning({ name: sponsors.name });
    return { log: { name: row?.name ?? null } };
  });
}
