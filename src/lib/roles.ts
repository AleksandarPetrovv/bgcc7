export const ROLES = ["host", "referee", "mappooler", "playtester", "streamer", "commentator"] as const;
export type Role = (typeof ROLES)[number];

export const PERMS = ["overview", "phase", "screening", "lobbies", "qualifiers", "mappools", "poolEdit", "poolVote", "teams", "matches", "draft", "staff", "log", "settings", "format"] as const;
export type Perm = (typeof PERMS)[number];

const GRANTS: Record<Role, readonly Perm[]> = {
  host: PERMS,
  referee: ["lobbies", "qualifiers", "matches", "draft", "format"],
  mappooler: ["mappools", "poolEdit", "poolVote", "format"],
  playtester: ["mappools", "poolVote", "format"],
  streamer: [],
  commentator: [],
};

export const can = (roles: readonly Role[] | null | undefined, perm: Perm) => !!roles?.some((r) => GRANTS[r].includes(perm));
export const hasAdmin = (roles: readonly Role[] | null | undefined) => !!roles?.some((r) => GRANTS[r].length);
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);
export const cleanRoles = (list: unknown[]): Role[] => {
  const roles = ROLES.filter((r) => list.includes(r));
  return roles.includes("host") ? ["host"] : roles;
};

export type ActionResult = { ok: boolean; error?: "forbidden" | "notFound" | "invalid" | "note" | "lastHost" | "taken" | "oneEach" } | null;
