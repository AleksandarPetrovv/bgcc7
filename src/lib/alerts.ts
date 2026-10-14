import "server-only";
import { EventEmitter } from "node:events";
import { eq, inArray, sql } from "drizzle-orm";
import { currentEdition, db } from "@/db";
import { getFormat } from "@/db/edition";
import { matches, teams, users } from "@/db/schema";
import { matchSlug, roundOf } from "./format";
import type { Alert, AlertKind } from "./alert-types";

/** who sees an alert: hosts, and/or these osu ids */
export type Audience = { hosts?: boolean; osuIds?: (number | null | undefined)[] };
type Entry = { alert: Alert; hosts: boolean; osuIds: number[] };
type Store = { list: Map<string, Entry>; bus: EventEmitter; since: Map<string, number> };

const g = globalThis as unknown as { bgccAlerts?: Store };
const store = () => (g.bgccAlerts ??= { list: new Map(), bus: new EventEmitter().setMaxListeners(0), since: new Map() });

export const alertId = (kind: AlertKind, key: string) => `${kind}:${currentEdition()}:${key}`;

export function raise(alert: Omit<Alert, "since">, who: Audience) {
  const s = store();
  const cur = s.list.get(alert.id);
  const next: Entry = {
    alert: { ...alert, since: cur?.alert.since ?? Date.now() },
    hosts: !!who.hosts,
    osuIds: [...new Set(who.osuIds?.filter((x): x is number => typeof x === "number"))],
  };
  if (cur && JSON.stringify(cur) === JSON.stringify(next)) return;
  s.list.set(alert.id, next);
  s.bus.emit("change");
}

export function clear(id: string) {
  const s = store();
  s.since.delete(id);
  if (s.list.delete(id)) s.bus.emit("change");
}

export function clearWhere(test: (a: Alert) => boolean) {
  const s = store();
  let hit = false;
  for (const [id, e] of s.list)
    if (test(e.alert)) {
      s.list.delete(id);
      s.since.delete(id);
      hit = true;
    }
  if (hit) s.bus.emit("change");
}

/** for problems that only count once they last: true when `id` has been failing for at least `ms` */
export function failingFor(id: string, ms: number) {
  const s = store();
  const t = s.since.get(id) ?? Date.now();
  s.since.set(id, t);
  return Date.now() - t >= ms;
}

export function alertsFor(osuId: number, host: boolean): Alert[] {
  return [...store().list.values()]
    .filter((e) => (host && e.hosts) || e.osuIds.includes(osuId))
    .map((e) => e.alert)
    .sort((a, b) => b.since - a.since);
}

export function onAlerts(fn: () => void) {
  const { bus } = store();
  bus.on("change", fn);
  return () => void bus.off("change", fn);
}

/** osu id of a staff member stored by name on a match (referee, streamer) */
export async function osuIdOf(name: string | null | undefined) {
  if (!name?.trim()) return null;
  const [u] = await db.select({ osuId: users.osuId }).from(users).where(sql`lower(${users.username}) = ${name.trim().toLowerCase()}`).limit(1).catch(() => []);
  return u?.osuId ?? null;
}

/** "Quarterfinals · Team A vs Team B" plus the slug, for the popup header and links */
export async function describeMatch(matchId: string): Promise<NonNullable<Alert["match"]>> {
  const f = getFormat();
  const slug = matchSlug(f, matchId);
  const [m] = await db.select({ t1: matches.team1Id, t2: matches.team2Id }).from(matches).where(eq(matches.id, matchId)).limit(1).catch(() => []);
  const ids = [m?.t1, m?.t2].filter((x): x is string => !!x);
  const names = ids.length ? await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, ids)).catch(() => []) : [];
  const nm = (id: string | null | undefined) => names.find((t) => t.id === id)?.name ?? "TBD";
  const round = f.rounds[roundOf(matchId)]?.name ?? matchId;
  return { id: matchId, slug, label: m ? `${round} · ${nm(m.t1)} vs ${nm(m.t2)}` : round };
}
