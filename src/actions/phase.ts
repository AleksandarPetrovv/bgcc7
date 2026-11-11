"use server";

import { getSettings, saveSettings, type Settings } from "@/db/settings";
import { getTeams } from "@/db/tournament";
import { announceTeams } from "@/db/discord-bot";
import { getBwsLock, lockBws, unlockBws } from "@/db/registrations";
import { phaseWarnings } from "@/db/phase-check";
import { guard, unchanged } from "@/lib/admin-action";
import { staffFor } from "@/lib/authz";
import type { ActionResult } from "@/lib/action-result";
import type { PhaseWarning } from "@/lib/phase-warnings";
import { PHASES, presetSections, TIMELINE_KEYS, type Phase } from "@/lib/sections";
import { fromSofiaInput } from "@/lib/time";
import { isBGCC6 } from "@/db";

const isPhase = (v: string): v is Phase => (PHASES as readonly string[]).includes(v);

/** the registration (and bgcc6 lobby booking) windows are the dates the timeline rows edit; sign-ups read these exact values */
const WINDOWS = ["regOpensAt", "regClosesAt", "bookingOpensAt", "bookingClosesAt"] as const;

async function applyPhase(p: Phase) {
  if ((await getSettings()).phase === p) return false;
  await saveSettings({ phase: p, sections: presetSections(p) });
  if (isBGCC6()) return true;
  // only before the draw: afterwards the locked ranks are what seeds and tiers were built on
  if (p === "registration") {
    if (!(await getTeams()).length) await unlockBws();
  }
  else if (!(await getBwsLock())) await lockBws();
  return true;
}

export async function checkPhase(phase: string): Promise<PhaseWarning[]> {
  if (!isPhase(phase) || !(await staffFor("phase"))) return [];
  return phaseWarnings(phase);
}

export async function setTimeline(_: ActionResult, fd: FormData) {
  return guard("phase", "phase.timeline", async () => {
    const windows: Partial<Pick<Settings, (typeof WINDOWS)[number]>> = {};
    for (const k of WINDOWS) {
      if (!fd.has(k)) continue;
      const raw = String(fd.get(k)).trim();
      const at = fromSofiaInput(raw);
      if (raw && !at) return { ok: false, error: "invalid" };
      windows[k] = at;
    }
    const date = (k: string) => {
      const v = String(fd.get(k) ?? "");
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    };
    const timeline = TIMELINE_KEYS.filter((k) => k !== "reg").map((key) => ({ key, from: date(`from.${key}`), to: date(`to.${key}`) }));
    await saveSettings({ timeline, ...windows });
    return { log: { timeline, ...windows } };
  });
}

export async function acceptPhase(phase: string) {
  return guard("phase", "phase.set", async () => {
    if (!isPhase(phase)) return { ok: false, error: "invalid" };
    if (!(await applyPhase(phase))) return unchanged;
    if (phase === "playoffs") announceTeams();
    return { log: { phase } };
  });
}

export async function dismissPhase(phase: string) {
  return guard("phase", "phase.dismiss", async ({ osuId }) => {
    const { phasePrompts } = await getSettings();
    await saveSettings({ phasePrompts: { ...phasePrompts, [osuId]: phase } });
    return { log: { phase } };
  });
}
