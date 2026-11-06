"use server";

import { redirect } from "next/navigation";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";
import { linkResult, unpair } from "@/lib/relay";

export async function linkApp(_: ActionResult, fd: FormData) {
  const res = await guard("matches", "refapp.link", async (osuId) => linkResult(fd, osuId));
  if (res?.ok) redirect("/admin/refapp");
  return res;
}

export async function unlinkApp() {
  return guard("matches", "refapp.unlink", async (osuId) => {
    await unpair(osuId);
    return { unlinked: true };
  });
}
