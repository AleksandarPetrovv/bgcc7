"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stages } from "@/db/schema";
import { saveSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";

export async function setRounds(_: ActionResult, fd: FormData) {
  return guard("settings", "settings.rounds", async () => {
    const rows = [...fd.entries()]
      .filter(([k]) => k.startsWith("ft."))
      .map(([k, v]) => ({ id: Number(k.slice(3)), firstTo: Math.round(Number(v)) }));
    if (!rows.length || rows.some((r) => !Number.isInteger(r.id) || !Number.isInteger(r.firstTo) || r.firstTo < 1 || r.firstTo > 20)) return { ok: false, error: "invalid" };
    for (const r of rows) await db.update(stages).set({ firstTo: r.firstTo }).where(eq(stages.id, r.id));
    return { rounds: rows };
  });
}

export async function setPickems(_: ActionResult, fd: FormData) {
  return guard("settings", "settings.pickems", async () => {
    const pickemsOpen = fd.get("open") === "1";
    await saveSettings({ pickemsOpen });
    return { pickemsOpen };
  });
}

export async function setQualify(_: ActionResult, fd: FormData) {
  return guard("settings", "settings.qualify", async () => {
    const qualifyCount = Number(fd.get("qualifyCount"));
    if (!Number.isInteger(qualifyCount) || qualifyCount < 3 || qualifyCount > 96) return { ok: false, error: "invalid" };
    await saveSettings({ qualifyCount });
    return { qualifyCount };
  });
}

export async function setDraft(_: ActionResult, fd: FormData) {
  return guard("settings", "settings.draft", async () => {
    const bans = Number(fd.get("bans"));
    const banOrder = fd.get("banOrder") === "abba" ? "abba" : "abab";
    const secs = (k: string) => Number(fd.get(k));
    const banSecs = secs("banSecs");
    const pickSecs = secs("pickSecs");
    const timeoutSecs = secs("timeoutSecs");
    const okSecs = (n: number) => Number.isInteger(n) && n >= 10 && n <= 900;
    if (!Number.isInteger(bans) || bans < 0 || bans > 4 || ![banSecs, pickSecs, timeoutSecs].every(okSecs)) return { ok: false, error: "invalid" };
    await saveSettings({ bans, banOrder, banSecs, pickSecs, timeoutSecs });
    return { bans, banOrder, banSecs, pickSecs, timeoutSecs };
  });
}
