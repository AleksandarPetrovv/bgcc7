export const ROLES = ["host", "referee", "mappooler"] as const;
export type Role = (typeof ROLES)[number];

export const PERMS = ["overview", "phase", "screening", "lobbies", "qualifiers", "mappools", "teams", "matches", "draft", "staff", "log", "settings"] as const;
export type Perm = (typeof PERMS)[number];

const GRANTS: Record<Role, readonly Perm[]> = {
  host: PERMS,
  referee: ["lobbies", "qualifiers", "matches", "draft"],
  mappooler: ["mappools"],
};

export const can = (roles: readonly Role[] | null | undefined, perm: Perm) => !!roles?.some((r) => GRANTS[r].includes(perm));
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);
export const cleanRoles = (list: unknown[]): Role[] => {
  const roles = ROLES.filter((r) => list.includes(r));
  return roles.includes("host") ? ["host"] : roles;
};

export const STAFF_ROLES = ["Host", "Mappooler", "Playtester", "Referee", "Streamer", "Commentator", "GFX / Designer", "Developer"];

export type ActionResult = { ok: boolean; error?: "forbidden" | "notFound" | "invalid" | "note" } | null;
