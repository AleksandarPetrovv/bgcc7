import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { matches, staff, userNames, users } from "./schema";
import { getMatches } from "./tournament";
import { getFormat } from "./edition";
import { matchSlug } from "@/lib/format";
import { userPath } from "@/lib/data";
import { isScene, type Scene } from "@/lib/scenes";
import { can, cleanRoles } from "@/lib/roles";

export async function usernameOf(osuId: number) {
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, osuId)).limit(1);
  return u?.username ?? null;
}

export async function overlayName(osuId: number) {
  const [first] = await db.select({ username: userNames.username }).from(userNames).where(eq(userNames.osuId, osuId)).orderBy(asc(userNames.at)).limit(1);
  return first?.username ?? (await usernameOf(osuId));
}

export const streamersOf = (m: { streamer: string | null }) => (m.streamer ?? "").split(",").map((s) => userPath(s.trim())).filter(Boolean);

export async function streamMatches(osuId: number, all: boolean) {
  const me = userPath((await usernameOf(osuId)) ?? "");
  const list = (await getMatches()).filter((m) => m.winner == null && (all || streamersOf(m).includes(me)));
  list.sort((a, b) => (a.datetime ? Date.parse(a.datetime) : Infinity) - (b.datetime ? Date.parse(b.datetime) : Infinity));
  const rows = list.length ? await db.select({ id: matches.id, scene: matches.scene }).from(matches).where(inArray(matches.id, list.map((m) => m.id))) : [];
  const scene = new Map(rows.map((r) => [r.id, isScene(r.scene) ? r.scene : null] as const));
  const f = getFormat();
  return list.map((m) => ({ ...m, slug: matchSlug(f, m.id), scene: scene.get(m.id) ?? null, mine: streamersOf(m).includes(me) }));
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
