"use server";

import { eq } from "drizzle-orm";
import { db, isBGCC6 } from "@/db";
import { stages } from "@/db/schema";
import { saveSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";

// bgcc6 only, like the settings panels that post here
export async function setRounds(_: ActionResult, fd: FormData) {
  return guard("settings", "settings.rounds", async () => {
    if (!isBGCC6()) return { ok: false, error: "forbidden" };
    const rows = [...fd.entries()]
      .filter(([k]) => k.startsWith("ft."))
      .map(([k, v]) => ({ id: Number(k.slice(3)), firstTo: Math.round(Number(v)) }));
    if (!rows.length || rows.some((r) => !Number.isInteger(r.id) || !Number.isInteger(r.firstTo) || r.firstTo < 1 || r.firstTo > 20)) return { ok: false, error: "invalid" };
    for (const r of rows) await db.update(stages).set({ firstTo: r.firstTo }).where(eq(stages.id, r.id));
    return { log: { rounds: rows } };
  });
}

export async function setQualify(_: ActionResult, fd: FormData) {
  return guard("settings", "settings.qualify", async () => {
    if (!isBGCC6()) return { ok: false, error: "forbidden" };
    const qualifyCount = Number(fd.get("qualifyCount"));
    if (!Number.isInteger(qualifyCount) || qualifyCount < 3 || qualifyCount > 96) return { ok: false, error: "invalid" };
    await saveSettings({ qualifyCount });
    return { log: { qualifyCount } };
  });
}
