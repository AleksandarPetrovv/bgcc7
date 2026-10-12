"use server";

import { redirect } from "next/navigation";
import { guard } from "@/lib/admin-action";
import { confirmLink, unpair } from "@/lib/relay";

export async function linkApp(state: string) {
  const res = await guard("matches", "refapp.link", async (osuId) => (confirmLink(state, osuId) ? { linked: true } : { ok: false, error: "invalid" }));
  if (res?.ok) redirect("/admin/refapp");
  return res;
}

export async function unlinkApp() {
  return guard("matches", "refapp.unlink", async (osuId) => {
    await unpair(osuId);
    return { unlinked: true };
  });
}
