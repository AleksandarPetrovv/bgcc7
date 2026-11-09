"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/authz";
import { guard } from "@/lib/admin-action";
import { can } from "@/lib/roles";
import { decideRequest, seeNotes } from "@/db/team-requests";
import { seeHostNote as seeNote } from "@/db/host-notes";

export async function decideTeamRequest(id: number, accept: boolean, note: string) {
  const reason = note.trim().slice(0, 500);
  if (!Number.isInteger(id) || (!accept && !reason)) return { ok: false, error: "invalid" as const };
  return guard("host", "team.request", async (v) => {
    const r = await decideRequest(id, accept, reason || null, v.osuId);
    if (!r) return { ok: false, error: "stale" };
    return { log: { team: r.team, accept, note: accept ? undefined : reason } };
  });
}

export async function seeHostNote(id: number) {
  if (!Number.isInteger(id)) return;
  const v = await getViewer();
  if (!v || !can(v.roles, "host")) return;
  await seeNote(id, v.osuId);
  revalidatePath("/", "layout");
}

export async function clearTeamNotes() {
  const v = await getViewer();
  if (!v) return;
  await seeNotes(v.osuId);
  revalidatePath("/", "layout");
}
