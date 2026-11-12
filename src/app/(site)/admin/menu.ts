import { isBGCC6 } from "@/db";
import { can, HELPER_PERMS, type Perm, type Role } from "@/lib/roles";
import { drawPhase, screeningPhase } from "@/lib/sections";

const SECTIONS = [
  { key: "helper", perm: HELPER_PERMS },
  { key: "phase", perm: ["phase"] },
  { key: "screening", perm: ["screening"] },
  { key: "lobbies", perm: ["lobbies"], bgcc6: true },
  { key: "qualifiers", perm: ["qualifiers"], bgcc6: true },
  { key: "mappools", perm: ["mappools"] },
  { key: "teams", perm: ["teams"] },
  { key: "draw", perm: ["host"], bgcc7: true },
  { key: "matches", perm: ["matches"] },
  { key: "scheduling", perm: ["matches"] },
  { key: "draft", perm: ["matches"] },
  { key: "stream", perm: ["stream"] },
  { key: "overlay", perm: ["overlay"] },
  { key: "site", perm: ["host"] },
  { key: "staff", perm: ["staff"] },
  { key: "log", perm: ["log"] },
  { key: "settings", perm: ["settings"] },
  { key: "discord", perm: ["discord"] },
  { key: "format", perm: ["host"] },
] as const satisfies readonly { key: string; perm: readonly Perm[]; bgcc6?: boolean; bgcc7?: boolean }[];

export type AdminKey = (typeof SECTIONS)[number]["key"];

/** sections the current phase has closed: they stay in the menu, last */
const phaseLocked = (phase: string): AdminKey[] => [...(screeningPhase(phase) ? [] : ["screening" as const]), ...(drawPhase(phase) ? [] : ["draw" as const])];

/** `hide`: sections closed for this viewer for now (mappools once the last pool settled, for poolers and testers) */
export function adminMenu(roles: readonly Role[] | null | undefined, phase: string, hide: readonly AdminKey[] = []) {
  const locked = phaseLocked(phase);
  return SECTIONS.filter((s) => (!("bgcc6" in s) || isBGCC6()) && (!("bgcc7" in s) || !isBGCC6()) && s.perm.some((p) => can(roles, p)) && !hide.includes(s.key))
    .map((s) => ({ key: s.key as AdminKey, href: `/admin/${s.key}`, locked: locked.includes(s.key) }))
    .sort((a, b) => +a.locked - +b.locked);
}
