export const ROLES = ["host", "admin", "referee", "mappooler"] as const;
export type Role = (typeof ROLES)[number];

export const PERMS = ["overview", "phase", "screening", "lobbies", "qualifiers", "mappools", "teams", "matches", "staff", "log"] as const;
export type Perm = (typeof PERMS)[number];

const GRANTS: Record<Role, readonly Perm[]> = {
  host: PERMS,
  admin: PERMS.filter((p) => p !== "staff"),
  referee: ["overview", "lobbies", "qualifiers", "matches"],
  mappooler: ["overview", "mappools"],
};

export const can = (role: Role | null | undefined, perm: Perm) => !!role && GRANTS[role].includes(perm);
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

export const STAFF_ROLES = ["Host", "Mappooler", "Playtester", "Referee", "Streamer", "Commentator", "GFX / Designer", "Developer"];

export type ActionResult = { ok: boolean; error?: "forbidden" | "notFound" | "invalid" | "note" } | null;
