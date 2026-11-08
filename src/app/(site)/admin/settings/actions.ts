"use server";

import { saveSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import { MAX_BANS } from "@/lib/format-plan";
import type { ActionResult } from "@/lib/action-result";

export async function setDraft(_: ActionResult, fd: FormData) {
  return guard("settings", "settings.draft", async () => {
    const bans = Number(fd.get("bans"));
    const banSecs = Number(fd.get("pickBanSecs"));
    const timeoutSecs = Number(fd.get("timeoutSecs"));
    const okSecs = (n: number) => Number.isInteger(n) && n >= 10 && n <= 900;
    if (!Number.isInteger(bans) || bans < 0 || bans > MAX_BANS || ![banSecs, timeoutSecs].every(okSecs)) return { ok: false, error: "invalid" };
    await saveSettings({ bans, banSecs, pickSecs: banSecs, timeoutSecs });
    return { log: { bans, banSecs, pickSecs: banSecs, timeoutSecs } };
  });
}
