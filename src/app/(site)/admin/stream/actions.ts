"use server";

import { guard, unchanged } from "@/lib/admin-action";
import { setZoom } from "@/lib/overlay-zoom";
import { can } from "@/lib/roles";
import { isScene } from "@/lib/scenes";
import { setMatchScene, streamMatches } from "@/db/stream";

export async function setScene(id: string, scene: string | null) {
  return guard("stream", "stream.scene", async ({ osuId, roles }) => {
    if (scene !== null && !isScene(scene)) return { ok: false, error: "invalid" };
    const list = await streamMatches(osuId, can(roles, "host"));
    if (!list.some((m) => m.id === id)) return { ok: false, error: "forbidden" };
    await setMatchScene(id, scene);
    return { log: { id, scene } };
  });
}

// not logged: a view toggle pressed many times a match, like a camera cut
export async function setBracketZoom(id: string, on: boolean) {
  return guard("stream", "stream.zoom", async ({ osuId, roles }) => {
    const list = await streamMatches(osuId, can(roles, "host"));
    if (!list.some((m) => m.id === id)) return { ok: false, error: "forbidden" };
    return setZoom(id, on === true) ? unchanged : { ok: false };
  });
}
