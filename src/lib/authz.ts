import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { currentOsuId } from "@/auth";
import { currentEdition, db } from "@/db";
import { adminLog, staff } from "@/db/schema";
import { getSettings } from "@/db/settings";
import { getFormat } from "@/db/edition";
import { can, cleanRoles, hasAdmin, HELPER_PERMS, type Perm, type Role } from "./roles";
import type { Section } from "./sections";
import type { ActionName } from "./action-names";

export type Viewer = { osuId: number; roles: Role[] };

export async function readRoles(osuId: number) {
  const [row] = await db.select({ roles: staff.permRoles }).from(staff).where(eq(staff.osuId, osuId)).limit(1);
  return cleanRoles(row?.roles ?? []);
}
const rolesOf = cache(readRoles);

export const helperAccess = (roles: readonly Role[]) => {
  const has = Object.fromEntries(HELPER_PERMS.map((p) => [p, can(roles, p)])) as Record<(typeof HELPER_PERMS)[number], boolean>;
  const ref = has.matches;
  const stream = has.overlay;
  return { ref, stream, any: ref || stream, host: roles.includes("host") };
};

/** the one gate for /api/relay/*; reads fresh roles (not the request cache) so it sees a role change made just before. a db error throws */
export const relayAccess = async (osuId: number) => helperAccess(await readRoles(osuId));

/** pages render a viewer without staff roles when the db is down */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const osuId = await currentOsuId();
  if (!osuId) return null;
  const roles = await rolesOf(osuId).catch((e) => {
    console.error("[viewer]", e);
    return [] as Role[];
  });
  return { osuId, roles };
});

/** the viewer if they hold `perm` (or any of a list), else null; a db error throws instead of reading as no access */
export async function staffFor(perm: Perm | readonly Perm[]): Promise<Viewer | null> {
  const osuId = await currentOsuId();
  if (!osuId) return null;
  const roles = await rolesOf(osuId);
  return [perm].flat().some((p) => can(roles, p)) ? { osuId, roles } : null;
}

export async function log(osuId: number, action: ActionName, payload?: unknown) {
  await db
    .insert(adminLog)
    .values({ osuId, action, payload: { ...(payload && typeof payload === "object" && !Array.isArray(payload) ? payload : payload == null ? {} : { value: payload }), _edition: currentEdition() } })
    .catch((e) => console.error("[admin log]", e));
}

export const getVisibility = cache(async () => {
  const [s, v] = await Promise.all([getSettings(), getViewer()]);
  const off = getFormat().sectionsOff;
  const sections = Object.fromEntries(Object.entries(s.sections).map(([k, on]) => [k, on && !off.includes(k)])) as typeof s.sections;
  return { sections, staff: hasAdmin(v?.roles), pools: can(v?.roles, "poolEdit"), off };
});

/** unreleased pools and packs are for hosts and mappoolers only */
export const poolOpen = async (released: boolean) => released || (await getVisibility()).pools;

/** a pool on the public mappool page and its pack download */
export async function poolListed(released: boolean) {
  const { sections, staff, pools } = await getVisibility();
  return pools || (released && (staff || sections.mappool));
}

export async function requireSection(section: Section) {
  const { sections, staff, off } = await getVisibility();
  if (off.includes(section) || (!sections[section] && !staff)) notFound();
}

export async function canSee(section: Section) {
  const { sections, staff, off } = await getVisibility();
  return !off.includes(section) && (staff || !!sections[section]);
}
