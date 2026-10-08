"use server";

import { guard } from "@/lib/admin-action";
import { confirmLink, unpair } from "@/lib/relay";

export async function linkHelper(state: string) {
  return guard("overlay", "overlay.link", async (osuId) => (confirmLink(state, osuId) ? { linked: true } : { ok: false, error: "invalid" }));
}

export async function unlinkHelper() {
  return guard("overlay", "overlay.unlink", async (osuId) => {
    await unpair(osuId);
    return { unlinked: true };
  });
}
