import { sofiaDate, type TimelineRow } from "./dates";
import { keyPhase, PHASES, type Phase } from "./sections";

export function duePhase(timeline: TimelineRow[], current: Phase, now = new Date()): Phase | null {
  const today = sofiaDate(now);
  let due: Phase | undefined;
  for (const r of timeline) if (r.from && r.from <= today) due = keyPhase(r.key) ?? due;
  return due && PHASES.indexOf(due) > PHASES.indexOf(current) ? due : null;
}
