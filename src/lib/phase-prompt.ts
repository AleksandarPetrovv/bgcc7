import { sofiaDate, type TimelineRow } from "./dates";
import { PHASES, type Phase } from "./sections";

/** noQuals: bgcc7 has no qualifiers phase, its "qual" row is the team draw (seeding) */
export function duePhase(timeline: TimelineRow[], current: Phase, noQuals = false, now = new Date()): Phase | null {
  const today = sofiaDate(now);
  let due = -1;
  timeline.forEach((r, i) => {
    if (r.from && r.from <= today) due = i;
  });
  const p = noQuals && PHASES[due] === "qualifiers" ? "seeding" : PHASES[due];
  return due >= 0 && PHASES.indexOf(p) > PHASES.indexOf(current) ? p : null;
}
