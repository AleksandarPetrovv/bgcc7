"use server";

import { guard } from "@/lib/admin-action";
import { confirmLink, unpair } from "@/lib/relay";

export async function linkApp(state: string) {
  return guard("matches", "refapp.link", async (osuId) => (confirmLink(state, osuId) ? { linked: true } : { ok: false, error: "invalid" }));
}

export async function unlinkApp() {
  return guard("matches", "refapp.unlink", async (osuId) => {
    await unpair(osuId);
    return { unlinked: true };
  });
}
