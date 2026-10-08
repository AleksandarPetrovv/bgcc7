import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { refApps, users } from "@/db/schema";

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
export const ircKey = (n: string) => n.trim().toLowerCase().replace(/ /g, "_");

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const validState = (st: string) => /^[A-Za-z0-9_-]{32,64}$/.test(st);
export const linkWord = (st: string) => [...createHash("sha256").update(st).digest().subarray(0, 4)].map((x) => ALPHA[x % 32]).join("");

export function confirmLink(st: string, osuId: number) {
  const { codes } = store();
  for (const [k, v] of codes) if (v.exp < Date.now()) codes.delete(k);
  if (!validState(st)) return false;
  codes.set(st, { osuId, exp: Date.now() + 10 * 60_000 });
  return true;
}

export async function claim(st: string, irc: string) {
  const { codes } = store();
  const hit = codes.get(st);
  if (!hit || hit.exp < Date.now()) return "pending" as const;
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, hit.osuId)).limit(1);
  codes.delete(st);
  if (!u || ircKey(u.username) !== ircKey(irc)) return "wrongname" as const;
  const token = randomBytes(32).toString("base64url");
  const row = { tokenHash: hash(token), ircName: u.username.replace(/ /g, "_"), createdAt: new Date(), seenAt: null };
  await db.insert(refApps).values({ osuId: hit.osuId, ...row }).onConflictDoUpdate({ target: refApps.osuId, set: row });
  drop(hit.osuId);
  return { token, osuId: hit.osuId };
}

export async function relayAuth(req: Request) {
  const t = req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!t) return null;
  const [row] = await db.select().from(refApps).where(eq(refApps.tokenHash, hash(t))).limit(1);
  return row ?? null;
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
}

export function relayStream(req: Request, osuId: number, ircName: string) {
  const { relays, bus } = store();
  drop(osuId);
  const enc = new TextEncoder();
  const r: Relay = { osuId, ircName };
  relays.set(osuId, r);
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    clearInterval(timer);
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
