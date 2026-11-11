import "server-only";
import { cache } from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, isBGCC6 } from "./index";
import { teamRequests, teams } from "./schema";
import { getSettings } from "./settings";
import { getTeams } from "./tournament";
import { captainOf } from "./schedule";
import { PHASES } from "@/lib/sections";

export const PIC_MAX = 20 * 1024 * 1024;
export const NAME_MAX = 40;
// osu! avatar size
export const PIC_SIZE = 256;
export const teamPicPath = (id: number) => `/api/team-pic/${id}`;

// captains pick their team name + picture until the playoffs phase
export const teamPickOpen = cache(async () => !isBGCC6() && PHASES.indexOf((await getSettings()).phase) < PHASES.indexOf("playoffs"));

const live = (teamId: string) =>
  db.select({ id: teamRequests.id }).from(teamRequests).where(and(eq(teamRequests.teamId, teamId), inArray(teamRequests.status, ["pending", "accepted"]))).limit(1);

/** the captain's team while it still owes a pick: nothing pending and nothing accepted yet */
export const owedPick = cache(async (osuId: number) => {
  if (!(await teamPickOpen())) return null;
  const team = (await getTeams()).find((t) => captainOf(t) === osuId);
  if (!team || (await live(team.id)).length) return null;
  return team;
});

/** the host's reason on the team's latest request when it was declined */
export async function declinedNote(teamId: string) {
  const [r] = await db.select({ status: teamRequests.status, note: teamRequests.note }).from(teamRequests).where(eq(teamRequests.teamId, teamId)).orderBy(desc(teamRequests.createdAt), desc(teamRequests.id)).limit(1);
  return r?.status === "rejected" ? r.note : null;
}

export type HostReq = { id: number; team: string; teamId: string; name: string; pic: string; oldName: string; oldPic: string };
export type CaptainNote = { id: number; ok: boolean; note: string | null; at: string };

export async function pendingRequests(): Promise<HostReq[]> {
  const [rows, all] = await Promise.all([
    db.select({ id: teamRequests.id, teamId: teamRequests.teamId, name: teamRequests.name, mime: teamRequests.mime }).from(teamRequests).where(eq(teamRequests.status, "pending")).orderBy(teamRequests.createdAt),
    getTeams(),
  ]);
  return rows.flatMap((r) => {
    const t = all.find((x) => x.id === r.teamId);
    if (!t) return [];
    const cap = t.players[0];
    return [{ id: r.id, team: t.name, teamId: t.id, name: r.name ?? cap?.username ?? t.name, pic: r.mime ? teamPicPath(r.id) : (cap?.avatar ?? ""), oldName: t.name, oldPic: t.image }];
  });
}

export async function captainNotes(osuId: number): Promise<CaptainNote[]> {
  const rows = await db
    .select({ id: teamRequests.id, status: teamRequests.status, note: teamRequests.note, at: teamRequests.decidedAt })
    .from(teamRequests)
    .where(and(eq(teamRequests.osuId, osuId), eq(teamRequests.seen, false), inArray(teamRequests.status, ["accepted", "rejected"])))
    .orderBy(desc(teamRequests.decidedAt));
  return rows.map((r) => ({ id: r.id, ok: r.status === "accepted", note: r.note, at: (r.at ?? new Date()).toISOString() }));
}

export const seeNotes = (osuId: number) => db.update(teamRequests).set({ seen: true }).where(and(eq(teamRequests.osuId, osuId), eq(teamRequests.seen, false)));

/** both fields empty applies the captain defaults at once and never reaches the hosts */
export async function submitRequest(teamId: string, osuId: number, name: string | null, pic: { bytes: Buffer; mime: string } | null) {
  const team = (await getTeams()).find((t) => t.id === teamId);
  const empty = !name && !pic;
  await db.transaction(async (tx) => {
    await tx.insert(teamRequests).values({ teamId, osuId, name, pic: pic?.bytes ?? null, mime: pic?.mime ?? null, status: empty ? "accepted" : "pending", seen: empty, decidedAt: empty ? new Date() : null });
    if (empty) await tx.update(teams).set({ name: team?.players[0]?.username ?? team?.name, image: "" }).where(eq(teams.id, teamId));
  });
}

export async function decideRequest(id: number, accept: boolean, note: string | null, by: number) {
  const [r] = await db.select({ osuId: teamRequests.osuId, teamId: teamRequests.teamId, name: teamRequests.name, mime: teamRequests.mime, status: teamRequests.status }).from(teamRequests).where(eq(teamRequests.id, id)).limit(1);
  if (!r || r.status !== "pending") return null;
  const team = (await getTeams()).find((t) => t.id === r.teamId);
  await db.transaction(async (tx) => {
    await tx.update(teamRequests).set({ status: accept ? "accepted" : "rejected", note: accept ? null : note, decidedBy: by, decidedAt: new Date() }).where(eq(teamRequests.id, id));
    if (accept) await tx.update(teams).set({ name: r.name ?? team?.players[0]?.username ?? team?.name, image: r.mime ? teamPicPath(id) : "" }).where(eq(teams.id, r.teamId));
  });
  return { team: team?.name ?? r.teamId, name: r.name, captain: r.osuId };
}

export async function teamPic(id: number) {
  const [r] = await db.select({ pic: teamRequests.pic, mime: teamRequests.mime, status: teamRequests.status }).from(teamRequests).where(eq(teamRequests.id, id)).limit(1);
  return r?.pic && r.mime ? r : null;
}
