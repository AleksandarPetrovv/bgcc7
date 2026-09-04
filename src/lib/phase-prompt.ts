import { sofiaDate, type TimelineRow } from "./dates";
import { PHASES, type Phase } from "./sections";

export function duePhase(timeline: TimelineRow[], current: Phase, now = new Date()): Phase | null {
  const today = sofiaDate(now);
  let due = -1;
  timeline.forEach((r, i) => {
    if (r.from && r.from <= today) due = i;
  });
  return due > PHASES.indexOf(current) ? PHASES[due] : null;
}
