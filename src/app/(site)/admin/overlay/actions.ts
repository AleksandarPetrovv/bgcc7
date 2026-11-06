"use server";

import { redirect } from "next/navigation";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";
import { linkResult, unpair } from "@/lib/relay";

export async function linkHelper(back: "refapp" | "overlay", _: ActionResult, fd: FormData) {
  const res = await guard("overlay", "overlay.link", async (osuId) => linkResult(fd, osuId));
  if (res?.ok) redirect(back === "overlay" ? "/admin/overlay" : "/admin/refapp");
  return res;
}

export async function unlinkHelper() {
  return guard("overlay", "overlay.unlink", async (osuId) => {
    await unpair(osuId);
    return { unlinked: true };
  });
}
