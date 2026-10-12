"use server";

import { redirect } from "next/navigation";
import { guard } from "@/lib/admin-action";
import { confirmLink, unpair } from "@/lib/relay";

export async function linkHelper(state: string, back: "refapp" | "overlay" = "refapp") {
  const res = await guard("overlay", "overlay.link", async (osuId) => (confirmLink(state, osuId) ? { linked: true } : { ok: false, error: "invalid" }));
  if (res?.ok) redirect(back === "overlay" ? "/admin/overlay" : "/admin/refapp");
  return res;
}

export async function unlinkHelper() {
  return guard("overlay", "overlay.unlink", async (osuId) => {
    await unpair(osuId);
    return { unlinked: true };
  });
}
