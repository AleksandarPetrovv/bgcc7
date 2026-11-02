import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { LINK_NAMES } from "./link-names";
import { EventEmitter } from "node:events";
import { and, eq } from "drizzle-orm";
import { db, withEdition } from "@/db";
import { mpLobbies, refApps, users } from "@/db/schema";
import { alertId, alertsFor, clearWhere, describeMatch, onAlerts, raise } from "./alerts";
import { nameKey, ircName } from "@/lib/names";
import { LINK_TTL } from "@/lib/format";

export type RelayMsg = { t: "open" } | { t: "line"; l: string } | { t: "close" };
export type RelayEv = { t: "opened" } | { t: "line"; l: string } | { t: "closed"; why?: string };

export class RelaySocket extends EventEmitter {
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
    this.r.push({ t: "open" });
    return this;
  }
  write(data: string) {
    if (this.dead) return false;
    for (const l of String(data).split(/\r?\n/)) if (l) this.r.push?.({ t: "line", l });
    return true;
  }
  destroy() {
    this.r.push?.({ t: "close" });
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

const g = globalThis as unknown as { bgccRelay?: Store };
const store = () => (g.bgccRelay ??= { relays: new Map(), codes: new Map(), bus: new EventEmitter().setMaxListeners(0) });

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export const validState = (st: string) => /^[A-Za-z0-9_-]{32,64}$/.test(st);

// pairing: the helper asks for a short code, the staff member types it on the site. no link carries the state,
// so nobody can send a ready-made "click to link" url. the secret state never leaves the helper except to us
const MAX_PENDING = 2000;
const MAX_FAILS = 5;
type Pending = { state: string; code: string; exp: number };
const gp = globalThis as unknown as { bgccLinkPending?: Map<string, Pending>; bgccLinkFails?: Map<number, { n: number; until: number }> };
const pending = () => (gp.bgccLinkPending ??= new Map());
const fails = () => (gp.bgccLinkFails ??= new Map());
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

export async function claim(st: string, irc: string | null) {
  const { codes } = store();
  const hit = codes.get(st);
  if (!hit || hit.exp < Date.now()) return "pending" as const;
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, hit.osuId)).limit(1);
  codes.delete(st);
  if (!u || (irc !== null && nameKey(u.username) !== nameKey(irc))) return "wrongname" as const;
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

const gs = globalThis as unknown as { bgccHelperSeen?: Map<number, number> };
const seen = () => (gs.bgccHelperSeen ??= new Map());
// the helper pings /api/relay/me every 20s, so this covers streamers that never open the irc relay
export const appRunning = (osuId: number) => relayOnline(osuId) || Date.now() - (seen().get(osuId) ?? 0) < 45_000;

// the helper says bye on quit, so the site shows it closed at once instead of after the 45s window
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
  r.push = undefined;
  r.sock?.end("app gone");
  store().relays.delete(osuId);
  store().bus.emit("relay", osuId, false);
  setTimeout(() => void helperGone(osuId).catch(() => {}), OFFLINE_GRACE).unref();
}

// a helper restart takes a few seconds; only call it offline when it stays gone
const OFFLINE_GRACE = 20_000;

const ownsHelperAlert = (osuId: number) => (a: { kind: string; id: string }) => a.kind === "helperOffline" && a.id.endsWith(`:${osuId}`);

async function helperGone(osuId: number) {
  if (relayOnline(osuId)) return;
  await withEdition("site", async () => {
    const open = await db.select({ matchId: mpLobbies.matchId }).from(mpLobbies).where(and(eq(mpLobbies.open, true), eq(mpLobbies.owner, String(osuId))));
    for (const { matchId } of open) {
      if (relayOnline(osuId)) return;
      const match = await describeMatch(matchId);
      raise({ id: alertId("helperOffline", `${matchId}:${osuId}`), kind: "helperOffline", level: "red", match, href: "/download/helper" }, { osuIds: [osuId] });
    }
  });
}

export function relayKick(osuId: number) {
  drop(osuId);
}

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
      r.push = (m) => send(`data: ${JSON.stringify(m)}\n\n`);
      timer = setInterval(() => send(": ping\n\n"), 15_000);
      req.signal.addEventListener("abort", stop);
      send(`data: ${JSON.stringify({ t: "hello", name: ircName, id: osuId })}\n\n`);
      void db.update(refApps).set({ seenAt: new Date() }).where(eq(refApps.osuId, osuId)).catch(() => {});
      bus.emit("relay", osuId, true);
      clearWhere(ownsHelperAlert(osuId));
      const pushAlerts = () => {
        const json = JSON.stringify(alertsFor(osuId, host));
        if (json === lastAlerts) return;
        lastAlerts = json;
        send(`data: {"t":"alerts","alerts":${json}}\n\n`);
      };
      offAlerts = onAlerts(pushAlerts);
      pushAlerts();
    },
    cancel: stop,
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}

export function relayIn(osuId: number, evs: RelayEv[]) {
  const r = store().relays.get(osuId);
  if (!r?.push) return false;
  for (const ev of evs) r.sock?.feed(ev);
  return true;
}
