import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { LINK_NAMES } from "./link-names";
import { EventEmitter } from "node:events";
import { and, eq } from "drizzle-orm";
import { db, withEdition } from "@/db";
import { globalStore } from "./global-store";
import { mpLobbies, refApps, users } from "@/db/schema";
import { alertsFor, clearWhere, describeMatch, onAlerts, ownedBy, ownerAlertId, raise } from "./alerts";
import { ircName } from "@/lib/names";
import { dm } from "./discord";
import { helperOfflineMessage } from "./discord-text";
import { SSE_HEADERS } from "@/lib/sse";
import { APP_SEEN_MS, LINK_TTL, OFFLINE_GRACE, SSE_PING_MS, sseFrame, validState, frame, type RelayEv, type RelayFrame, type RelayMsg } from "@/lib/relay-contract";

class RelaySocket extends EventEmitter {
  private opened?: () => void;
  private dead = false;
  constructor(private r: Relay) {
    super();
  }
  setTimeout() {
    return this;
  }
  connect(_port: number, _host: string, cb: () => void) {
    this.opened = cb;
    this.r.sock = this;
    if (!this.r.push) return void setImmediate(() => this.end("app offline"));
    this.r.push(frame.open());
    return this;
  }
  write(data: string) {
    if (this.dead) return false;
    for (const l of String(data).split(/\r?\n/)) if (l) this.r.push?.(frame.line(l));
    return true;
  }
  destroy() {
    this.r.push?.(frame.close());
    this.end("destroyed");
  }
  feed(ev: RelayEv) {
    if (this.dead) return;
    if (ev.t === "opened") this.opened?.();
    else if (ev.t === "line") this.emit("data", `${ev.l}\n`);
    else this.end(ev.why ?? "closed");
  }
  end(why: string) {
    if (this.dead) return;
    this.dead = true;
    if (this.r.sock === this) this.r.sock = undefined;
    this.emit("error", new Error(why));
  }
}

type Relay = { osuId: number; ircName: string; push?: (m: RelayMsg) => void; sock?: RelaySocket };
type Store = { relays: Map<number, Relay>; codes: Map<string, { osuId: number; exp: number }>; bus: EventEmitter };

const store = () => globalStore<Store>("bgccRelay", () => ({ relays: new Map(), codes: new Map(), bus: new EventEmitter().setMaxListeners(0) }));

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

// pairing: the helper asks for a short code, the staff member types it on the site. no link carries the state,
// so nobody can send a ready-made "click to link" url. the secret state never leaves the helper except to us
const MAX_PENDING = 2000;
const MAX_FAILS = 5;
type Pending = { state: string; code: string; exp: number };
const pending = () => globalStore("bgccLinkPending", () => new Map<string, Pending>());
const fails = () => globalStore("bgccLinkFails", () => new Map<number, { n: number; until: number }>());
const codeKey = (c: string) => c.trim().toLowerCase();

const sweep = () => {
  const now = Date.now();
  for (const [k, v] of pending()) if (v.exp < now) pending().delete(k);
  for (const [k, v] of store().codes) if (v.exp < now) store().codes.delete(k);
};

export function startLink(st: string) {
  if (!validState(st)) return null;
  sweep();
  for (const p of pending().values()) if (p.state === st) return p.code;
  if (pending().size >= MAX_PENDING) return null;
  for (let i = 0; i < 50; i++) {
    const code = `${LINK_NAMES[randomInt(LINK_NAMES.length)]}_${String(randomInt(1000)).padStart(3, "0")}`;
    if (pending().has(codeKey(code))) continue;
    pending().set(codeKey(code), { state: st, code, exp: Date.now() + LINK_TTL });
    return code;
  }
  return null;
}

export function confirmCode(input: string, osuId: number): "ok" | "wrong" | "locked" {
  const now = Date.now();
  const f = fails().get(osuId) ?? { n: 0, until: 0 };
  if (f.until > now) return "locked";
  sweep();
  const key = codeKey(String(input).slice(0, 64));
  const hit = pending().get(key);
  if (!hit) {
    if (++f.n >= MAX_FAILS) Object.assign(f, { n: 0, until: now + LINK_TTL });
    fails().set(osuId, f);
    return f.until > now ? "locked" : "wrong";
  }
  pending().delete(key);
  fails().delete(osuId);
  store().codes.set(hit.state, { osuId, exp: Date.now() + LINK_TTL });
  return "ok";
}

export async function claim(st: string) {
  const { codes } = store();
  const hit = codes.get(st);
  if (!hit || hit.exp < Date.now()) return "pending" as const;
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, hit.osuId)).limit(1);
  codes.delete(st);
  if (!u) return "wrongname" as const;
  const token = randomBytes(32).toString("base64url");
  const row = { tokenHash: hash(token), ircName: ircName(u.username), createdAt: new Date(), seenAt: null };
  await db.insert(refApps).values({ osuId: hit.osuId, ...row }).onConflictDoUpdate({ target: refApps.osuId, set: row });
  drop(hit.osuId);
  return { token, osuId: hit.osuId, name: row.ircName };
}

export async function relayAuth(req: Request) {
  const t = req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!t) return null;
  const [row] = await db.select().from(refApps).where(eq(refApps.tokenHash, hash(t))).limit(1);
  if (row) seen().set(row.osuId, Date.now());
  return row ?? null;
}

const seen = () => globalStore("bgccHelperSeen", () => new Map<number, number>());
// the helper polls /api/relay/me, so this covers streamers that never open the irc relay
export const appRunning = (osuId: number) => relayOnline(osuId) || Date.now() - (seen().get(osuId) ?? 0) < APP_SEEN_MS;

// the helper says bye on quit, so the site shows it closed at once instead of after the APP_SEEN_MS window
export async function appClosed(osuId: number) {
  seen().delete(osuId);
  drop(osuId);
  await db.update(refApps).set({ seenAt: new Date() }).where(eq(refApps.osuId, osuId));
}

export async function unpair(osuId: number) {
  await db.delete(refApps).where(eq(refApps.osuId, osuId));
  drop(osuId);
}

export async function appOf(osuId: number) {
  const [row] = await db.select({ ircName: refApps.ircName, seenAt: refApps.seenAt }).from(refApps).where(eq(refApps.osuId, osuId)).limit(1);
  return row ?? null;
}

export const relayOnline = (osuId: number) => !!store().relays.get(osuId)?.push;

// when each helper last disconnected; one that never connected since the app started counts from app start
const gone = () => globalStore("bgccHelperGone", () => ({ born: Date.now(), at: new Map<number, number>() }));
/** ms the helper has been offline, null while it is online */
export const offlineFor = (osuId: number) => (relayOnline(osuId) ? null : Date.now() - (gone().at.get(osuId) ?? gone().born));
export const relayName = (osuId: number) => (relayOnline(osuId) ? store().relays.get(osuId)!.ircName : null);
export const relaySocket = (osuId: number) => new RelaySocket(store().relays.get(osuId) ?? { osuId, ircName: "" });

export function onRelay(fn: (osuId: number, up: boolean) => void) {
  const { bus } = store();
  bus.on("relay", fn);
  return () => void bus.off("relay", fn);
}

function drop(osuId: number) {
  const r = store().relays.get(osuId);
  if (!r) return;
  gone().at.set(osuId, Date.now());
  r.push = undefined;
  r.sock?.end("app gone");
  store().relays.delete(osuId);
  store().bus.emit("relay", osuId, false);
  for (const wait of [OFFLINE_GRACE, HOSTS_GRACE]) setTimeout(() => void helperGone(osuId, wait).catch((e) => console.error("[relay] helper gone", e)), wait).unref();
}

// a short drop is the referee's own business; hosts and the referee's discord hear about it only when it lasts
const HOSTS_GRACE = 180_000;

async function helperGone(osuId: number, wait: number) {
  // offline for less than this timer's wait: it came back in between and dropped again
  if ((offlineFor(osuId) ?? 0) < wait - 1000) return;
  const late = wait === HOSTS_GRACE;
  await withEdition("site", async () => {
    const open = await db.select({ matchId: mpLobbies.matchId }).from(mpLobbies).where(and(eq(mpLobbies.open, true), eq(mpLobbies.owner, String(osuId))));
    for (const { matchId } of open) {
      if (relayOnline(osuId)) return;
      const match = await describeMatch(matchId);
      raise({ id: ownerAlertId("helperOffline", matchId, osuId), kind: "helperOffline", level: "red", match, href: "/download/helper" }, { hosts: late, osuIds: [osuId] });
      if (!late) continue;
      const [u] = await db.select({ id: users.discordId }).from(users).where(eq(users.osuId, osuId)).limit(1);
      if (u?.id) await dm(u.id, helperOfflineMessage(match.label));
    }
  });
}

export { drop as relayKick };

export function relayStream(req: Request, osuId: number, ircName: string, host = false) {
  const { relays, bus } = store();
  drop(osuId);
  const enc = new TextEncoder();
  const r: Relay = { osuId, ircName };
  relays.set(osuId, r);
  let timer: ReturnType<typeof setInterval> | undefined;
  let offAlerts = () => {};
  let lastAlerts = "";
  const stop = () => {
    clearInterval(timer);
    offAlerts();
    if (relays.get(osuId) === r) drop(osuId);
  };
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (s: string) => {
        try {
          ctrl.enqueue(enc.encode(s));
        } catch {
          stop();
        }
      };
      const push = (f: RelayFrame) => send(sseFrame(f));
      r.push = push;
      timer = setInterval(() => send(": ping\n\n"), SSE_PING_MS);
      req.signal.addEventListener("abort", stop);
      push(frame.hello(ircName, osuId));
      void db.update(refApps).set({ seenAt: new Date() }).where(eq(refApps.osuId, osuId)).catch(() => {});
      bus.emit("relay", osuId, true);
      clearWhere(ownedBy("helperOffline", osuId));
      const pushAlerts = () => {
        const alerts = alertsFor(osuId, host);
        const json = JSON.stringify(alerts);
        if (json === lastAlerts) return;
        lastAlerts = json;
        push(frame.alerts(alerts));
      };
      offAlerts = onAlerts(pushAlerts);
      pushAlerts();
    },
    cancel: stop,
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

export function relayIn(osuId: number, evs: RelayEv[]) {
  const r = store().relays.get(osuId);
  if (!r?.push) return false;
  for (const ev of evs) r.sock?.feed(ev);
  return true;
}
