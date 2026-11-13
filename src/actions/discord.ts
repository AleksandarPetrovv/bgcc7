"use server";

import { guard } from "@/lib/admin-action";
import { CFG_KEYS, CFG_VOICE, setCfg, syncDiscord } from "@/db/discord-bot";
import { guildChannels } from "@/lib/discord";
import type { ActionResult } from "@/lib/action-result";

/** saves the picked channels, then applies access to them and builds the team sections (once the draw is done) */
export async function syncChannels(_: ActionResult, fd: FormData) {
  return guard("discord", "discord.sync", async () => {
    const chans = await guildChannels();
    const picked: Record<string, string> = {};
    for (const k of CFG_KEYS) {
      const v = String(fd.get(k) ?? "");
      const ok = chans.some((c) => c.id === v && (CFG_VOICE.includes(k) ? c.type === 2 : c.type === 0 || c.type === 5));
      picked[k] = ok ? v : "";
      await setCfg(k, picked[k]);
    }
    await syncDiscord();
    return { log: picked };
  });
}
