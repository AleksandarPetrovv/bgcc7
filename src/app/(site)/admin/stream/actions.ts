"use server";

import { guard } from "@/lib/admin-action";
import { getViewer } from "@/lib/authz";
import { can } from "@/lib/roles";
import { isScene } from "@/lib/scenes";
import { setMatchScene, streamMatches } from "@/db/stream";

export async function setScene(id: string, scene: string | null) {
  return guard("stream", "stream.scene", async (osuId) => {
    if (scene !== null && !isScene(scene)) return { ok: false, error: "invalid" };
    const v = await getViewer();
    const list = await streamMatches(osuId, can(v?.roles, "matches"));
    if (!list.some((m) => m.id === id)) return { ok: false, error: "forbidden" };
    await setMatchScene(id, scene);
    return { id, scene };
  });
}
