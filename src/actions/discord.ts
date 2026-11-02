"use server";

import { guard } from "@/lib/admin-action";
import { cleanupDiscord, setCfg, syncTeams } from "@/db/discord-bot";
import { getSettings } from "@/db/settings";
import { guildChannels } from "@/lib/discord";
import type { ActionResult } from "@/lib/action-result";

export async function saveChannels(_: ActionResult, fd: FormData) {
  return guard("discord", "discord.channels", async () => {
    const ids = new Set((await guildChannels()).filter((c) => c.type === 0 || c.type === 5).map((c) => c.id));
    const pick = (k: string) => {
      const v = String(fd.get(k) ?? "");
      return ids.has(v) ? v : "";
    };
    const results = pick("results");
    const pool = pick("pool");
    await setCfg("results", results);
    await setCfg("pool", pool);
    return { log: { results, pool } };
  });
}

export async function syncNow() {
  return guard("discord", "discord.sync", async () => {
    await syncTeams();
    return;
  });
}

export async function cleanup() {
  return guard("discord", "discord.cleanup", async () => {
    if ((await getSettings()).phase !== "finished") return { ok: false, error: "invalid" };
    await cleanupDiscord();
    return;
  });
}
