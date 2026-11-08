import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, editionKey } from "./index";
import { matches, staff, userNames, users } from "./schema";
import { getAllMatches } from "./tournament";
import { nameKey } from "@/lib/names";
import { isScene, type Scene } from "@/lib/scenes";
import { can, cleanRoles } from "@/lib/roles";
import { getLive } from "@/lib/live-scores";
import { IPC_PLAYING } from "@/lib/relay-contract";
import { staffNames } from "@/lib/staff-names";
import { globalStore } from "@/lib/global-store";

const focus = () => globalStore("bgccStreamFocus", () => new Map<string, string>());

async function usernameOf(osuId: number) {
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, osuId)).limit(1);
  return u?.username ?? null;
}

export async function overlayName(osuId: number) {
  const [first] = await db.select({ username: userNames.username }).from(userNames).where(eq(userNames.osuId, osuId)).orderBy(asc(userNames.at)).limit(1);
  return first?.username ?? (await usernameOf(osuId));
}

export const streamersOf = (m: { streamer: string | null }) => staffNames(m.streamer).map(nameKey);

export async function streamMatches(osuId: number, all: boolean) {
  const me = nameKey((await usernameOf(osuId)) ?? "");
  const list = (await getAllMatches()).filter((m) => m.winner == null && (all || streamersOf(m).includes(me)));
  list.sort((a, b) => (a.datetime ? Date.parse(a.datetime) : Infinity) - (b.datetime ? Date.parse(b.datetime) : Infinity));
  const rows = list.length ? await db.select({ id: matches.id, scene: matches.scene }).from(matches).where(inArray(matches.id, list.map((m) => m.id))) : [];
  const scene = new Map(rows.map((r) => [r.id, isScene(r.scene) ? r.scene : null] as const));
  return list.map((m) => ({ ...m, slug: m.id, scene: scene.get(m.id) ?? null, mine: streamersOf(m).includes(me) }));
}

export async function currentStreamMatch(osuId: number) {
  const me = nameKey((await usernameOf(osuId)) ?? "");
  const list = (await getAllMatches()).filter((m) => streamersOf(m).includes(me));
  const key = editionKey(osuId);
  if (!list.length) {
    focus().delete(key);
    return null;
  }
  const pending = list.filter((m) => m.winner === null).sort((a, b) => (a.datetime ? Date.parse(a.datetime) : Infinity) - (b.datetime ? Date.parse(b.datetime) : Infinity));
  const activeIds = new Set(pending.filter((m) => m.running).map((m) => m.id));
  const active = pending.find((m) => activeIds.has(m.id));
  const current = list.find((m) => m.id === focus().get(key));
  // keep the final map and winner on stream until the next match actually opens.
  const held = current && (current.winner !== null || activeIds.has(current.id) || !active);
  const stillPlaying = current && getLive(current.id)?.ipcState === IPC_PLAYING;
  const selected = stillPlaying ? current : active ?? (held ? current : undefined) ?? pending[0] ?? list.sort((a, b) => (b.datetime ? Date.parse(b.datetime) : 0) - (a.datetime ? Date.parse(a.datetime) : 0))[0];
  focus().set(key, selected.id);
  return { ...selected, slug: selected.id };
}

export async function setMatchScene(id: string, scene: Scene | null) {
  await db.update(matches).set({ scene }).where(eq(matches.id, id));
}

export async function overlayUser(key: string) {
  const rows = await db
    .select({ osuId: userNames.osuId, roles: staff.permRoles })
    .from(userNames)
    .innerJoin(staff, eq(staff.osuId, userNames.osuId))
    .where(sql`lower(replace(${userNames.username}, ' ', '_')) = ${key}`);
  const hit = rows.find((r) => can(cleanRoles(r.roles), "overlay"));
  if (!hit) return null;
  return { osuId: hit.osuId, name: (await overlayName(hit.osuId)) ?? String(hit.osuId) };
}
