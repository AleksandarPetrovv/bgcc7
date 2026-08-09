"use server";

import { saveSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";
import { PHASE_TIMELINE, PHASES, presetSections, SECTIONS, TIMELINE_KEYS, type Phase } from "@/lib/sections";
import { fromSofiaInput } from "@/lib/time";

export async function setPhase(_: ActionResult, fd: FormData) {
  return guard("phase", "phase.set", async () => {
    const phase = String(fd.get("phase"));
    if (!(PHASES as readonly string[]).includes(phase)) return { ok: false, error: "invalid" };
    const p = phase as Phase;
    await saveSettings({ phase: p, sections: presetSections(p), timelineAt: PHASE_TIMELINE[p] });
    return { phase: p };
  });
}

export async function setSections(_: ActionResult, fd: FormData) {
  return guard("phase", "phase.sections", async () => {
    const sections = Object.fromEntries(SECTIONS.map((s) => [s, fd.get(s) === "on"])) as Record<(typeof SECTIONS)[number], boolean>;
    await saveSettings({ sections });
    return { shown: SECTIONS.filter((s) => sections[s]) };
  });
}

export async function setDates(_: ActionResult, fd: FormData) {
  return guard("phase", "phase.dates", async () => {
    const date = (k: string) => fromSofiaInput(String(fd.get(k) ?? ""));
    const qualifyCount = Number(fd.get("qualifyCount"));
    if (!Number.isInteger(qualifyCount) || qualifyCount < 3 || qualifyCount > 96) return { ok: false, error: "invalid" };
    const patch = {
      regOpensAt: date("regOpensAt"),
      regClosesAt: date("regClosesAt"),
      bookingOpensAt: date("bookingOpensAt"),
      bookingClosesAt: date("bookingClosesAt"),
      pickemsOpen: fd.get("pickemsOpen") === "on",
      qualifyCount,
    };
    await saveSettings(patch);
    return patch;
  });
}

export async function setTimeline(_: ActionResult, fd: FormData) {
  return guard("phase", "phase.timeline", async () => {
    const timeline = TIMELINE_KEYS.map((key) => ({ key, dates: String(fd.get(`dates.${key}`) ?? "").trim().slice(0, 40) }));
    const cur = String(fd.get("current") ?? "");
    const timelineAt = (TIMELINE_KEYS as readonly string[]).includes(cur) ? cur : null;
    await saveSettings({ timeline, timelineAt });
    return { timeline, timelineAt };
  });
}
