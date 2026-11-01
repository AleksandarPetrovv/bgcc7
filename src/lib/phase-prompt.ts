import { sofiaDate, type TimelineRow } from "./dates";
import { keyPhase, PHASES, type Phase } from "./sections";

/** noQuals: bgcc7 has no qualifiers phase, its "qual" row is the team draw (seeding) */
export function duePhase(timeline: TimelineRow[], current: Phase, noQuals = false, now = new Date()): Phase | null {
  const today = sofiaDate(now);
  let due: Phase | undefined;
  for (const r of timeline) if (r.from && r.from <= today) due = keyPhase(r.key) ?? due;
  const p = noQuals && due === "qualifiers" ? "seeding" : due;
  return p && PHASES.indexOf(p) > PHASES.indexOf(current) ? p : null;
}
