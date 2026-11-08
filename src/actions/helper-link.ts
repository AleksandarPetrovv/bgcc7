"use server";

import { guard } from "@/lib/admin-action";
import { getViewer, helperAccess } from "@/lib/authz";
import type { ActionResult } from "@/lib/action-result";
import { HELPER_PERMS } from "@/lib/roles";
import { confirmCode, unpair } from "@/lib/relay";
import { helperView } from "@/lib/helper-sig";

export async function linkHelper(_: ActionResult, fd: FormData) {
  return guard(HELPER_PERMS, "helper.link", async ({ osuId }) => {
    const r = confirmCode(String(fd.get("code") ?? ""), osuId);
    if (r !== "ok") return { ok: false, error: r === "locked" ? "locked" : "wrongCode" };
    return { log: { linked: true } };
  });
}

export async function unlinkHelper() {
  return guard(HELPER_PERMS, "helper.unlink", async ({ osuId }) => {
    await unpair(osuId);
    return { log: { unlinked: true } };
  });
}

export async function helperState() {
  const v = await getViewer();
  if (!v || !helperAccess(v.roles).any) return null;
  return (await helperView(v.osuId)).sig;
}
