"use server";

import { guard } from "@/lib/admin-action";
import { can } from "@/lib/roles";
import { isScene } from "@/lib/scenes";
import { setMatchScene, streamMatches } from "@/db/stream";

export async function setScene(id: string, scene: string | null) {
  return guard("stream", "stream.scene", async ({ osuId, roles }) => {
    if (scene !== null && !isScene(scene)) return { ok: false, error: "invalid" };
    const list = await streamMatches(osuId, can(roles, "matches"));
    if (!list.some((m) => m.id === id)) return { ok: false, error: "forbidden" };
    await setMatchScene(id, scene);
    return { log: { id, scene } };
  });
}
