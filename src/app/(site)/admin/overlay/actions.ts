"use server";

import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";
import { linkResult, unpair } from "@/lib/relay";

export async function linkHelper(_: ActionResult, fd: FormData) {
  return guard("overlay", "overlay.link", async (osuId) => linkResult(fd, osuId));
}

export async function unlinkHelper() {
  return guard("overlay", "overlay.unlink", async (osuId) => {
    await unpair(osuId);
    return { unlinked: true };
  });
}
