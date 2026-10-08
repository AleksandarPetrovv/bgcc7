import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { currentOsuId } from "@/auth";
import { db } from "@/db";
import { adminLog, staff } from "@/db/schema";
import { safe } from "@/db/queries";
import { getSettings } from "@/db/settings";
import { getFormat } from "@/db/edition";
import { can, cleanRoles, hasAdmin, type Perm, type Role } from "./roles";
import type { Section } from "./sections";

export const getViewer = cache(async (): Promise<{ osuId: number; roles: Role[] } | null> => {
  const osuId = await currentOsuId();
  if (!osuId) return null;
  const roles = await safe(async () => {
    const [row] = await db.select({ roles: staff.permRoles }).from(staff).where(eq(staff.osuId, osuId)).limit(1);
    return cleanRoles(row?.roles ?? []);
  }, [] as Role[]);
  return { osuId, roles };
});

export async function requireRole(perm: Perm) {
  const v = await getViewer();
  if (!v || !can(v.roles, perm)) throw new Error("forbidden");
  return v;
}

export async function log(osuId: number, action: string, payload?: unknown) {
  await db
    .insert(adminLog)
    .values({ osuId, action, payload: payload ?? null })
    .catch((e) => console.error("[admin log]", e));
}

export const getVisibility = cache(async () => {
  const [s, v] = await Promise.all([getSettings(), getViewer()]);
  const off = getFormat().sectionsOff;
  const sections = Object.fromEntries(Object.entries(s.sections).map(([k, on]) => [k, on && !off.includes(k)])) as typeof s.sections;
  return { sections, staff: hasAdmin(v?.roles), off };
});

export async function requireSection(section: Section) {
  const { sections, staff, off } = await getVisibility();
  if (off.includes(section) || (!sections[section] && !staff)) notFound();
}

export async function canSee(section: Section) {
  const { sections, staff, off } = await getVisibility();
  return !off.includes(section) && (staff || !!sections[section]);
}
