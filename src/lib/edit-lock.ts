import type { Role } from "./roles";

export const REF_EDIT_DAYS = 10;

/** referees can't edit a match that started more than 10 days ago; hosts always can, matches without a time never lock */
export const editLocked = (roles: readonly Role[], datetime: string | null, now = Date.now()) =>
  !roles.includes("host") && !!datetime && now - new Date(datetime).getTime() > REF_EDIT_DAYS * 86_400_000;
