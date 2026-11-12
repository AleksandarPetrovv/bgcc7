import { nameKey } from "./names";

import type { Team } from "./data";

/** a match's referee/streamer/commentators field: names joined with ", " by the admin dropdowns; typed ones may use & or / */
export const staffNames = (field: string | null | undefined) =>
  (field ?? "")
    .split(/[,&/]| and /)
    .map((s) => s.trim())
    .filter(Boolean);

/** whether a duty field names this person (`key` is their nameKey) */
export const staffHas = (field: string | null | undefined, key: string) => staffNames(field).some((n) => nameKey(n) === key);

export const joinStaff = (names: string[]) => names.join(", ");

/** name keys of everyone playing in the match: they can't also referee, stream or comment it */
export const playersOf = (teams: Team[], m: { team1Id: string | null; team2Id: string | null }) =>
  new Set(teams.filter((t) => t.id === m.team1Id || t.id === m.team2Id).flatMap((t) => t.players.map((p) => nameKey(p.username))));
