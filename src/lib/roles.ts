export const ROLES = ["host", "technical", "leadDesign", "referee", "mappooler", "playtester", "streamer", "commentator", "designer"] as const;
export type Role = (typeof ROLES)[number];

export const PERMS = ["host", "phase", "screening", "lobbies", "qualifiers", "mappools", "poolEdit", "poolVote", "teams", "matches", "staff", "log", "settings", "format", "formatEdit", "stream", "overlay", "discord"] as const;
export type Perm = (typeof PERMS)[number];

const GRANTS: Record<Role, readonly Perm[]> = {
  host: PERMS,
  referee: ["lobbies", "qualifiers", "matches", "format", "stream"],
  mappooler: ["mappools", "poolEdit", "poolVote", "format", "formatEdit"],
  playtester: ["mappools", "poolVote", "format"],
  streamer: ["stream", "overlay"],
  commentator: [],
  technical: [],
  leadDesign: [],
  designer: [],
};

// referees link the helper for lobbies, streamers for the overlay
export const HELPER_PERMS = ["matches", "overlay"] as const satisfies readonly Perm[];

export const can = (roles: readonly Role[] | null | undefined, perm: Perm) => !!roles?.some((r) => GRANTS[r].includes(perm));
export const hasAdmin = (roles: readonly Role[] | null | undefined) => !!roles?.some((r) => GRANTS[r].length);
export const titleOnly = (r: Role) => GRANTS[r].length === 0;
export const PLAYABLE: readonly Role[] = ["streamer", "commentator", "designer", "leadDesign"];
export const cleanRoles = (list: unknown[]): Role[] => {
  const roles = ROLES.filter((r) => list.includes(r));
  return roles.includes("host") ? roles.filter((r) => r === "host" || titleOnly(r)) : roles;
};
