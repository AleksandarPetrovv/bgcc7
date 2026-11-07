"use server";

import { guard } from "@/lib/admin-action";
import { getViewer } from "@/lib/authz";
import { can, type ActionResult } from "@/lib/roles";
import { linkResult, unpair } from "@/lib/relay";
import { helperSig } from "@/lib/helper-sig";

export async function linkApp(_: ActionResult, fd: FormData) {
  return guard("matches", "helper.link", async (osuId) => linkResult(fd, osuId));
}

export async function unlinkApp() {
  return guard("matches", "helper.unlink", async (osuId) => {
    await unpair(osuId);
    return { unlinked: true };
  });
}

export async function helperState() {
  const v = await getViewer();
  if (!v || !(can(v.roles, "matches") || can(v.roles, "overlay"))) return null;
  return helperSig(v.osuId);
}
