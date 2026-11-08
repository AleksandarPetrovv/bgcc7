import { isBGCC6 } from "@/db";
import { can, HELPER_PERMS, type Perm, type Role } from "@/lib/roles";

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
  { key: "format", perm: ["format"] },
] as const satisfies readonly { key: string; perm: readonly Perm[]; bgcc6?: boolean; bgcc7?: boolean }[];

export type AdminKey = (typeof SECTIONS)[number]["key"];

export const adminMenu = (roles: readonly Role[] | null | undefined) =>
  SECTIONS.filter((s) => (!("bgcc6" in s) || isBGCC6()) && (!("bgcc7" in s) || !isBGCC6()) && s.perm.some((p) => can(roles, p))).map((s) => ({ key: s.key as AdminKey, href: `/admin/${s.key}` }));
