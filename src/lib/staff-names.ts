/** a match's referee/streamer/commentators field: names joined with ", " by the admin dropdowns; typed ones may use & or / */
export const staffNames = (field: string | null | undefined) =>
  (field ?? "")
    .split(/[,&/]| and /)
    .map((s) => s.trim())
    .filter(Boolean);

export const joinStaff = (names: string[]) => names.join(", ");
