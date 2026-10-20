export const ROLES = ["host", "technical", "leadDesign", "referee", "mappooler", "playtester", "streamer", "commentator", "designer"] as const;
export type Role = (typeof ROLES)[number];

export const PERMS = ["overview", "phase", "screening", "lobbies", "qualifiers", "mappools", "poolEdit", "poolVote", "teams", "matches", "draft", "staff", "log", "settings", "format", "formatEdit", "stream", "overlay"] as const;
export type Perm = (typeof PERMS)[number];

const GRANTS: Record<Role, readonly Perm[]> = {
  host: PERMS,
  referee: ["lobbies", "qualifiers", "matches", "draft", "format", "stream"],
  mappooler: ["mappools", "poolEdit", "poolVote", "format", "formatEdit"],
  playtester: ["mappools", "poolVote", "format"],
  streamer: ["stream", "overlay"],
  commentator: [],
  technical: [],
  leadDesign: [],
  designer: [],
};

export const can = (roles: readonly Role[] | null | undefined, perm: Perm) => !!roles?.some((r) => GRANTS[r].includes(perm));
export const hasAdmin = (roles: readonly Role[] | null | undefined) => !!roles?.some((r) => GRANTS[r].length);
export const titleOnly = (r: Role) => GRANTS[r].length === 0;
export const PLAYABLE: readonly Role[] = ["streamer", "commentator", "designer", "leadDesign"];
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);
export const cleanRoles = (list: unknown[]): Role[] => {
  const roles = ROLES.filter((r) => list.includes(r));
  return roles.includes("host") ? roles.filter((r) => r === "host" || titleOnly(r)) : roles;
};

export type ActionResult = { ok: boolean; error?: "forbidden" | "notFound" | "invalid" | "note" | "lastHost" | "taken" | "oneEach" | "stale" } | null;
