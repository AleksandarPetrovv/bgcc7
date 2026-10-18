import "server-only";
import { EventEmitter } from "node:events";
import { and, desc, eq } from "drizzle-orm";
import { BanchoClient, type BanchoLobby, type BanchoLobbyPlayerScore, type BanchoMultiplayerChannel } from "bancho.js";
import { RateLimiterMemory, RateLimiterQueue } from "rate-limiter-flexible";
import { db, withEdition } from "@/db";
import { matches, mpChat, mpLobbies, users } from "@/db/schema";
import { getAllTeams } from "@/db/tournament";
import { getHosts } from "@/db/admin";
import { getFormat } from "@/db/edition";
import { getDraft, lobbyTimer, onDraft } from "@/db/drafts";
import type { DraftView } from "@/lib/draft";
import { blocked } from "@/lib/chat-filter";
import { onRelay, relayName, relayOnline, relaySocket } from "@/lib/relay";
import { alertId, clearWhere, describeMatch, raise } from "@/lib/alerts";

import { closeLobby, onFinished, react, swapSlots } from "./bancho";

export type LobbySlot = { slot: number; name: string; id: number | null; side: 1 | 2 | null; team: "red" | "blue" | null; ready: "ready" | "notready" | "nomap"; host: boolean; mods: string[] };
export type LobbyView = {
  bot: "off" | "connecting" | "online";
  state: "none" | "open" | "closed";
  mpId: number | null;
  password: string;
  size: number;
  spare?: boolean;
  slots: (LobbySlot | null)[];
  mapId: number | null;
  mapName: string | null;
  mods: string[];
  freemod: boolean;
  playing: boolean;
  chat: ChatLine[];
  owner: number | null;
  mine?: boolean;
  helper?: boolean;
};

export type Conn = { client: BanchoClient; ready: Promise<unknown> | null; owner: number };
export type ChatLine = { id?: number; at: number; from: string; text: string; ref?: boolean; local?: boolean; side?: 1 | 2 };
export type Live = {
  matchId: string;
  owner: number;
  mpId: number;
  lobby: BanchoLobby;
  members: Map<number, 1 | 2>;
  seats: Map<number, number>;
  placed: Set<number>;
  chat: ChatLine[];
  names: [string, string];
  seen: DraftView | null;
  queue: Promise<unknown>;
  active: number;
};
export type State = { conns: Map<number, Conn>; live: Map<string, Live>; bus: EventEmitter; restored: boolean };

export const g = globalThis as unknown as { bgccIrc?: State };

const apiKey = () => process.env.OSU_API_V1_KEY || null;

const creds = (owner: number) => {
  const key = apiKey();
  if (!key) return null;
  const name = relayName(owner);
  return name ? { username: name, password: "relay", apiKey: key } : null;
};

export const canLobby = (osuId: number) => !!creds(osuId);

export const ownerOf = (owner: string) => Number(owner) || 0;

export function state(): State | null {
  if (!apiKey()) return null;
  if (!g.bgccIrc)
    withEdition("site", () => {
      g.bgccIrc = { conns: new Map(), live: new Map(), bus: new EventEmitter().setMaxListeners(0), restored: false };
      console.log(`[bancho] state created pid=${process.pid}`);
      setInterval(sweepIdle, 30_000).unref();
      setInterval(syncIdle, 5_000).unref();
      onDraft((id) => react(id));
      onRelay((osuId, up) => withEdition("site", () => (up ? void restoreOwner(osuId) : dropConn(osuId))));
    });
  return g.bgccIrc ?? null;
}

export function conn(owner: number): Conn | null {
  const s = state();
  if (!s) return null;
  const have = s.conns.get(owner);
  if (have) return have;
  const c = creds(owner);
  if (!c) return null;
  const x = withEdition("site", () => newConn(s, c, owner));
  s.conns.set(owner, x);
  return x;
}

function dropConn(owner: number) {
  const s = g.bgccIrc;
  const c = s?.conns.get(owner);
  if (!c) return;
  s!.conns.delete(owner);
  for (const l of [...s!.live.values()])
    if (l.owner === owner) {
      l.lobby.removeAllListeners();
      l.lobby.channel.removeAllListeners("message");
      s!.live.delete(l.matchId);
    }
  try {
    c.client.disconnect();
  } catch {}
  ping();
}

type Sock = {
  client: unknown;
  reconnect: boolean;
  connectCallback: ((e?: Error) => void) | null;
  isConnected: () => boolean;
  onClose: (e: Error) => void;
  handleIrcCommand: (c: string) => void;
  emit: (ev: string, e: Error) => void;
  initSocket: () => void;
};

function newConn(s: State, c: NonNullable<ReturnType<typeof creds>>, owner: number): Conn {
  const client = new BanchoClient({ username: c.username, password: c.password, apiKey: c.apiKey, rateLimiter: new RateLimiterQueue(new RateLimiterMemory({ points: 9, duration: 5.5 })) as never });
  (client as unknown as Sock).initSocket = function (this: Sock) {
    const sock = relaySocket(owner);
    this.client = sock;
    sock.on("error", (e: Error) => {
      // bancho.js retries every 5s forever and never settles connect(); through the relay that
      // reopens osu! irc over and over until bancho stops accepting us. fail once, reconnect on demand.
      const wasUp = this.isConnected();
      const cb = this.connectCallback;
      this.reconnect = false;
      this.onClose(e);
      if (!wasUp && cb) {
        this.connectCallback = null;
        cb(e);
      }
    });
    let buf = "";
    sock.on("data", (d: string) => {
      buf += d.replace(/\r/g, "");
      let i;
      while ((i = buf.indexOf("\n")) !== -1) {
        const cmd = buf.slice(0, i);
        buf = buf.slice(i + 1);
        this.handleIrcCommand(cmd);
      }
    });
  };
  const x: Conn = { client, ready: null, owner };
  const tag = `[bancho ${c.username}]`;
  client.on("error", (e) => console.error(tag, e.message));
  console.log(`${tag} new client pid=${process.pid}`);
  client.on("connected", () => {
    console.log(`${tag} connected`);
    for (const l of s.live.values()) if (l.owner === owner) void rejoin(l);
    clearWhere((a) => a.kind === "ircLost" && a.id.endsWith(`:${owner}`));
    ping();
  });
  client.on("disconnected", (e) => {
    console.log(`${tag} disconnected: ${e?.message ?? "?"}`);
    // with the helper gone the helperOffline alert covers it; this one is for irc dropping on its own
    if (relayOnline(owner)) void ircLost(s, owner, e?.message).catch(() => {});
    ping();
  });
  client.on("PART", (m) => {
    if (!m.user.isClient()) return;
    const l = [...s.live.values()].find((v) => v.owner === owner && `#mp_${v.mpId}` === m.channel.name);
    if (l) void markClosed(l.matchId);
  });
  return x;
}

async function ircLost(s: State, owner: number, why?: string) {
  await withEdition("site", async () => {
    for (const l of s.live.values()) {
      if (l.owner !== owner) continue;
      const match = await describeMatch(l.matchId);
      raise({ id: alertId("ircLost", `${l.matchId}:${owner}`), kind: "ircLost", level: "red", match, href: `/matches/${match.slug}`, detail: why }, { hosts: true, osuIds: [owner] });
    }
  });
}

export async function online(owner: number) {
  const c = conn(owner);
  if (!c) throw new Error("irc off");
  if (!c.client.isConnected()) {
    c.ready ??= withEdition("site", () => c.client.connect()).finally(() => (c.ready = null));
    await c.ready;
  }
  return c;
}

export const ping = (matchId?: string) => g.bgccIrc?.bus.emit("change", matchId ?? "*");

export function onLobby(fn: () => void) {
  const s = state();
  if (!s) return () => {};
  s.bus.on("change", fn);
  return () => void s.bus.off("change", fn);
}

export async function ensureBot() {
  const s = state();
  if (!s) return null;
  if (!s.restored) {
    s.restored = true;
    const open = await db.select().from(mpLobbies).where(eq(mpLobbies.open, true));
    for (const r of open) {
      const owner = ownerOf(r.owner);
      if (s.live.has(r.matchId) || !canLobby(owner)) continue;
      await restore(s, r.matchId, r.mpId, owner).catch(() => markClosed(r.matchId));
    }
  }
  return s;
}

async function restoreOwner(owner: number) {
  const s = state();
  if (!s) return;
  ping();
  const open = await db.select().from(mpLobbies).where(eq(mpLobbies.open, true));
  for (const r of open) if (ownerOf(r.owner) === owner && !s.live.has(r.matchId)) await restore(s, r.matchId, r.mpId, owner).catch(() => markClosed(r.matchId));
}

export async function lobbyOwner(matchId: string) {
  const [row] = await db.select({ owner: mpLobbies.owner, open: mpLobbies.open }).from(mpLobbies).where(eq(mpLobbies.matchId, matchId)).limit(1);
  return row?.open ? ownerOf(row.owner) : null;
}

export async function membersOf(matchId: string) {
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  const teams = await getAllTeams();
  const map = new Map<number, 1 | 2>();
  const seats = new Map<number, number>();
  const per = getFormat().teamSize;
  for (const [tid, side] of [[m?.team1Id, 1], [m?.team2Id, 2]] as const)
    for (const [k, p] of (teams.find((t) => t.id === tid)?.players ?? []).entries()) {
      map.set(p.userId, side);
      if (k < per) seats.set(p.userId, (side - 1) * per + k);
    }
  const nm = (id: string | null | undefined) => teams.find((t) => t.id === id)?.name ?? "TBD";
  return { match: m, teams, map, seats, names: [nm(m?.team1Id), nm(m?.team2Id)] as [string, string], seen: await getDraft(matchId) };
}

async function history(mpId: number): Promise<ChatLine[]> {
  const rows = await db.select().from(mpChat).where(eq(mpChat.mpId, mpId)).orderBy(desc(mpChat.id)).limit(150).catch(() => []);
  return rows.reverse().map((r) => ({ id: r.id, at: r.at.getTime(), from: r.from, text: r.text, ...(r.local ? { local: true } : {}), ...(r.side === 1 || r.side === 2 ? { side: r.side } : {}) }));
}

export async function sayLocal(matchId: string, by: number, raw: string, side: 1 | 2 | null) {
  const text = raw.replace(/[\r\n]+/g, " ").trim().slice(0, 300);
  if (!text) return "empty" as const;
  if (blocked(text)) return "blocked" as const;
  const wait = (lastSent.get(by) ?? 0) + CHAT_GAP - Date.now();
  if (wait > 0) return "cooldown" as const;
  const l = g.bgccIrc?.live.get(matchId);
  if (!l) return "closed" as const;
  lastSent.set(by, Date.now());
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, by)).limit(1);
  const line: ChatLine = { at: Date.now(), from: (u?.username ?? String(by)).replace(/ /g, "_"), text, local: true, ...(side ? { side } : {}) };
  l.chat.push(line);
  if (l.chat.length > 150) l.chat.splice(0, l.chat.length - 150);
  await db.insert(mpChat).values({ matchId, mpId: l.mpId, at: new Date(line.at), from: line.from, text, local: true, side }).returning({ id: mpChat.id }).then(([row]) => { line.id = row.id; }).catch((e) => console.error("[bancho] chat save", e));
  ping(matchId);
  return "ok" as const;
}

async function restore(s: State, matchId: string, mpId: number, owner: number) {
  console.log(`[bancho] restore ${matchId} mp ${mpId}`);
  const c = await online(owner);
  const ch = c.client.getChannel(`#mp_${mpId}`) as BanchoMultiplayerChannel;
  await ch.join();
  const { map, seats, names, seen } = await membersOf(matchId);
  const l: Live = { matchId, owner, mpId, lobby: ch.lobby, members: map, seats, placed: new Set(map.keys()), chat: await history(mpId), names, seen, queue: Promise.resolve(), active: Date.now() };
  attach(l);
  s.live.set(matchId, l);
  await ch.lobby.updateSettings();
  ping(matchId);
}

async function rejoin(l: Live) {
  try {
    await l.lobby.channel.join();
    await l.lobby.updateSettings();
  } catch {
    await markClosed(l.matchId);
  }
  ping(l.matchId);
}

const IDLE = 5 * 60_000;

function sweepIdle() {
  const s = g.bgccIrc;
  if (!s) return;
  for (const l of s.live.values()) if (!l.lobby.playing && Date.now() - l.active > IDLE) void closeLobby(l.matchId).catch(() => {});
}

const SYNC_GAP = 10_000;
const SYNC_IDLE = 15_000;
const NONCED = /^!mp (map|mods|lock|unlock|size|set|clearhost|close|start|timer|aborttimer|abort|settings)\b/;
const SETTINGS_LINE =/^(Room name:|Beatmap:|Team mode:|Active mods:|Players:|Slot \d+\s)/;
const synced = new Map<string, { last: number; quietUntil: number; timer?: ReturnType<typeof setTimeout> }>();
export const syncOf = (matchId: string) => synced.get(matchId) ?? synced.set(matchId, { last: 0, quietUntil: 0 }).get(matchId)!;

function runSync(l: Live) {
  const s = syncOf(l.matchId);
  if (g.bgccIrc?.live.get(l.matchId) !== l) return void synced.delete(l.matchId);
  s.last = Date.now();
  s.quietUntil = s.last + 5_000;
  void l.lobby.updateSettings().then(() => ping(l.matchId)).catch(() => {});
}

function autoSync(l: Live) {
  const s = syncOf(l.matchId);
  if (s.timer || Date.now() - s.last < 4_000) return;
  const wait = s.last + SYNC_GAP - Date.now();
  if (wait <= 0) return runSync(l);
  s.timer = setTimeout(() => {
    s.timer = undefined;
    runSync(l);
  }, wait);
}

function syncIdle() {
  for (const l of g.bgccIrc?.live.values() ?? []) {
    const s = syncOf(l.matchId);
    if (!l.lobby.playing && l.lobby.slots.some(Boolean) && !s.timer && Date.now() - s.last >= SYNC_IDLE) runSync(l);
  }
}

const CMD_GAP = 750;
const paceQ = new Map<number, { q: Promise<unknown>; last: number }>();

function pace(channel: unknown, mpId: number) {
  const c = channel as { sendMessage: (m: string) => Promise<unknown>; paced?: boolean };
  if (c.paced) return;
  c.paced = true;
  const raw = c.sendMessage.bind(c);
  c.sendMessage = (m: string) => {
    if (!m.startsWith("!")) return raw(m);
    const s = paceQ.get(mpId) ?? { q: Promise.resolve(), last: 0 };
    paceQ.set(mpId, s);
    const run = s.q.then(async () => {
      const wait = s.last + CMD_GAP - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      s.last = Date.now();
      return raw(m);
    });
    s.q = run.catch(() => {});
    return run;
  };
}

export function attach(l: Live) {
  const lb = l.lobby;
  pace(lb.channel, l.mpId);
  const up = () => {
    l.active = Date.now();
    ping(l.matchId);
  };
  for (const ev of ["playerJoined", "playerLeft", "playerMoved", "playerChangedTeam", "host", "hostCleared", "matchStarted", "matchFinished", "matchAborted", "beatmapId", "beatmap", "mods", "freemod", "size", "allPlayersReady", "matchSettings"] as const) lb.on(ev as "matchStarted", up);
  for (const ev of ["playerJoined", "playerLeft", "playerMoved", "playerChangedTeam", "beatmapId", "mods", "allPlayersReady", "matchFinished", "matchAborted"] as const) lb.on(ev as "matchStarted", () => autoSync(l));
  lb.on("matchStarted", () => void playStart.set(l.matchId, Date.now()));
  for (const ev of ["matchFinished", "matchAborted"] as const) lb.on(ev as "matchStarted", () => void playStart.delete(l.matchId));
  lb.channel.on("message", (msg) => {
    const own = msg.self && typed.delete(`${l.matchId}|${msg.message}`);
    const shown = msg.self && !own && NONCED.test(msg.message) ? msg.message.replace(/^(!mp \S+.*?) (?=[a-z0-9]*[a-z])[a-z0-9]{8,}$/, "$1") : msg.message;
    const quiet = Date.now() < (synced.get(l.matchId)?.quietUntil ?? 0);
    if (quiet && (msg.self ? shown === "!mp settings" : msg.user.ircUsername === "BanchoBot" && SETTINGS_LINE.test(msg.message))) return;
    const line: ChatLine = { at: Date.now(), from: msg.user.ircUsername, text: shown.slice(0, 1000) };
    l.chat.push(line);
    void db
      .insert(mpChat)
      .values({ matchId: l.matchId, mpId: l.mpId, at: new Date(line.at), from: line.from, text: line.text })
      .returning({ id: mpChat.id })
      .then(([row]) => { line.id = row.id; ping(l.matchId); })
      .catch((e) => console.error("[bancho] chat save", e));
    if (l.chat.length > 150) l.chat.splice(0, l.chat.length - 150);
    const cmd = msg.message.trim().match(/^!mp\s+(timer|aborttimer)\b\s*(\d+)?/i);
    if (cmd) void timerBy(l.matchId, msg.self, msg.user.ircUsername).then((ok) => (ok ? lobbyTimer(l.matchId, cmd[1].toLowerCase() === "timer" ? Math.min(Number(cmd[2] ?? 30), 3600) || 30 : null) : undefined)).catch((e) => console.error("[bancho] timer", e));
    up();
  });
  (lb as unknown as EventEmitter).on("matchFinished", (scores: BanchoLobbyPlayerScore[]) =>
    void onFinished(
      l.matchId,
      scores.map((s) => ({ score: s.score, pass: s.pass, team: s.player?.team, userId: s.player?.user?.id })),
    ).catch((e) => console.error("[bancho] score", e)),
  );
  lb.on("playerJoined", async ({ player }) => {
    try {
      if (!player.user.id) await player.user.fetchFromAPI();
      const side = l.members.get(player.user.id);
      const want = side === 1 ? "Red" : side === 2 ? "Blue" : null;
      if (want && player.team !== want) await lb.changeTeam(player, want);
      const id = player.user.id;
      const seat = l.seats.get(id);
      if (seat == null || l.placed.has(id)) return;
      l.placed.add(id);
      const from = lb.slots.findIndex((p) => p?.user.id === id);
      if (from >= 0 && from !== seat) await swapSlots(l, (m) => lb.channel.sendMessage(m), from, seat);
    } catch {}
  });
}

const nameKey = (n: string) => n.trim().toLowerCase().replace(/ /g, "_");

async function timerBy(matchId: string, self: boolean, from: string) {
  if (self) return true;
  const [m] = await db.select({ referee: matches.referee }).from(matches).where(eq(matches.id, matchId)).limit(1);
  const refs = (m?.referee ?? "").split(/[,&/]| and /).map(nameKey).filter(Boolean);
  const hosts = (await getHosts()).map((h) => nameKey(h.username));
  return [...refs, ...hosts].includes(nameKey(from));
}

export async function markClosed(matchId: string) {
  console.log(`[bancho] closed ${matchId}`);
  const s = g.bgccIrc;
  const l = s?.live.get(matchId);
  if (l) {
    l.lobby.removeAllListeners();
    l.lobby.channel.removeAllListeners("message");
    s!.live.delete(matchId);
  }
  await db.update(mpLobbies).set({ open: false, closedAt: new Date() }).where(and(eq(mpLobbies.matchId, matchId), eq(mpLobbies.open, true)));
  clearWhere((a) => a.match?.id === matchId && (a.kind === "ircLost" || a.kind === "helperOffline"));
  ping(matchId);
}


export const lastSent = new Map<number, number>();
export const typed = new Map<string, number>();
export const playStart = new Map<string, number>();
export const CHAT_GAP = 1500;
