"use server";

import { saveSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";

export async function setDraft(_: ActionResult, fd: FormData) {
  return guard("settings", "settings.draft", async () => {
    const bans = Number(fd.get("bans"));
    const banOrder = "abab" as const;
    const secs = (k: string) => Number(fd.get(k));
    const banSecs = secs("pickBanSecs");
    const pickSecs = banSecs;
    const timeoutSecs = secs("timeoutSecs");
    const okSecs = (n: number) => Number.isInteger(n) && n >= 10 && n <= 900;
    if (!Number.isInteger(bans) || bans < 0 || bans > 4 || ![banSecs, pickSecs, timeoutSecs].every(okSecs)) return { ok: false, error: "invalid" };
    await saveSettings({ bans, banOrder, banSecs, pickSecs, timeoutSecs });
    return { log: { bans, banOrder, banSecs, pickSecs, timeoutSecs } };
  });
}
