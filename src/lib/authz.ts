import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { currentOsuId } from "@/auth";
import { db } from "@/db";
import { adminLog, staff } from "@/db/schema";
import { safe } from "@/db/queries";
import { getSettings } from "@/db/settings";
import { ADMINS } from "./admins";
import { can, isRole, type Perm, type Role } from "./roles";
import type { Section } from "./sections";

export const getViewer = cache(async (): Promise<{ osuId: number; role: Role | null } | null> => {
  const osuId = await currentOsuId();
  if (!osuId) return null;
  if (ADMINS.includes(osuId)) return { osuId, role: "host" };
  const role = await safe(async () => {
    const [row] = await db.select({ role: staff.permRole }).from(staff).where(eq(staff.osuId, osuId)).limit(1);
    return isRole(row?.role) ? row.role : null;
  }, null);
  return { osuId, role };
});

export async function requireRole(perm: Perm) {
  const v = await getViewer();
  if (!v || !can(v.role, perm)) throw new Error("forbidden");
  return v as { osuId: number; role: Role };
}

export async function log(osuId: number, action: string, payload?: unknown) {
  await db
    .insert(adminLog)
    .values({ osuId, action, payload: payload ?? null })
    .catch((e) => console.error("[admin log]", e));
}

export const getVisibility = cache(async () => {
  const [s, v] = await Promise.all([getSettings(), getViewer()]);
  return { sections: s.sections, staff: !!v?.role };
});

export async function requireSection(section: Section) {
  const { sections, staff } = await getVisibility();
  if (!sections[section] && !staff) notFound();
}

export async function canSee(section: Section) {
  const { sections, staff } = await getVisibility();
  return staff || !!sections[section];
}
