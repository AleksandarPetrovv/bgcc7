"use server";

import { getSettings, saveSettings } from "@/db/settings";
import { getTeams } from "@/db/tournament";
import { getBwsLock, lockBws, unlockBws } from "@/db/registrations";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";
import { PHASES, phasesFor, presetSections, SECTIONS, TIMELINE_KEYS, type Phase } from "@/lib/sections";
import { fromSofiaInput } from "@/lib/time";
import { isBGCC6 } from "@/db";

async function applyPhase(p: Phase) {
  if (!phasesFor(isBGCC6()).includes(p)) return false;
  await saveSettings({ phase: p, sections: presetSections(p) });
  if (isBGCC6()) return;
  // only before the draw: afterwards the locked ranks are what seeds and tiers were built on
  if (p === "registration") {
    if (!(await getTeams()).length) await unlockBws();
  }
  else if (!(await getBwsLock())) await lockBws();
}

export async function setPhase(_: ActionResult, fd: FormData) {
  return acceptPhase(String(fd.get("phase")));
}

export async function setSections(_: ActionResult, fd: FormData) {
  return guard("phase", "phase.sections", async () => {
    const sections = Object.fromEntries(SECTIONS.map((s) => [s, fd.get(s) === "on"])) as Record<(typeof SECTIONS)[number], boolean>;
    await saveSettings({ sections });
    return { log: { shown: SECTIONS.filter((s) => sections[s]) } };
  });
}

export async function setDates(_: ActionResult, fd: FormData) {
  return guard("phase", "phase.dates", async () => {
    const date = (k: string) => fromSofiaInput(String(fd.get(k) ?? ""));
    const patch = {
      regOpensAt: date("regOpensAt"),
      regClosesAt: date("regClosesAt"),
      bookingOpensAt: date("bookingOpensAt"),
      bookingClosesAt: date("bookingClosesAt"),
    };
    if (Object.entries(patch).some(([k, d]) => String(fd.get(k) ?? "").trim() && !d)) return { ok: false, error: "invalid" };
    await saveSettings(patch);
    return { log: patch };
  });
}

export async function setTimeline(_: ActionResult, fd: FormData) {
  return guard("phase", "phase.timeline", async () => {
    const date = (k: string) => {
      const v = String(fd.get(k) ?? "");
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    };
    const timeline = TIMELINE_KEYS.filter((k) => k !== "reg").map((key) => ({ key, from: date(`from.${key}`), to: date(`to.${key}`) }));
    await saveSettings({ timeline });
    return { log: { timeline } };
  });
}

export async function acceptPhase(phase: string) {
  return guard("phase", "phase.set", async () => {
    if (!(PHASES as readonly string[]).includes(phase)) return { ok: false, error: "invalid" };
    const p = phase as Phase;
    if ((await applyPhase(p)) === false) return { ok: false, error: "invalid" };
    return { log: { phase: p } };
  });
}

export async function dismissPhase(phase: string) {
  return guard("phase", "phase.dismiss", async ({ osuId }) => {
    const { phasePrompts } = await getSettings();
    await saveSettings({ phasePrompts: { ...phasePrompts, [osuId]: phase } });
    return { log: { phase } };
  });
}
