import "server-only";
import { EventEmitter } from "node:events";
import { and, desc, eq } from "drizzle-orm";
import { BanchoClient, type BanchoLobby, type BanchoLobbyPlayerScore, type BanchoMultiplayerChannel } from "bancho.js";
import { RateLimiterMemory, RateLimiterQueue } from "rate-limiter-flexible";
import { db, withEdition } from "@/db";
import { globalStore, peekStore } from "@/lib/global-store";
import { matches, mpChat, mpLobbies, users } from "@/db/schema";
import { getAllTeams } from "@/db/tournament";
import { getHosts } from "@/db/admin";
import { getFormat } from "@/db/edition";
import { getDraft, lobbyTimer, onDraft, rulesOf, setResult } from "@/db/drafts";
import type { DraftView } from "@/lib/draft";
import { blocked } from "@/lib/chat-filter";
import { onRelay, relayName, relayOnline, relaySocket } from "@/lib/relay";
import { clearWhere, describeMatch, ownedBy, ownerAlertId, raise } from "@/lib/alerts";
import { cueAbort, cueCountdown, cueFinish, cuePlay } from "@/lib/overlay-cues";
import { lobbySize } from "@/lib/format";

import { CHAT_GAP, CHAT_KEEP, chatLine, cleanChat, type ChatLine } from "./lobby-chat";
import { nameKey, ircName } from "@/lib/names";
import { staffNames } from "@/lib/staff-names";

export type LobbySlot = { slot: number; name: string; id: number | null; side: 1 | 2 | null; team: "red" | "blue" | null; ready: "ready" | "notready" | "nomap"; host: boolean; mods: string[] };
export type LobbyView = {
  bot: "off" | "connecting" | "online";
  state: "none" | "open" | "closed";
  mpId: number | null;
  past: number[];
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
type Sync = { last: number; quietUntil: number; timer?: ReturnType<typeof setTimeout> };
type Keep = { synced: Map<string, Sync>; paceQ: Map<number, { q: Promise<unknown>; last: number }>; lastSent: Map<number, number>; typed: Map<string, number>; playStart: Map<string, number> };

const KEY = "bgccIrc";
const cur = () => peekStore<State>(KEY);

const keep = globalStore<Keep>("bgccIrcKeep", () => ({ synced: new Map(), paceQ: new Map(), lastSent: new Map(), typed: new Map(), playStart: new Map() }));
const { synced, paceQ } = keep;
export const { lastSent, typed, playStart } = keep;

type Handlers = { closeLobby: (matchId: string) => Promise<void>; react: (matchId: string) => void };
let handlers: Handlers | null = null;

/** bancho.ts hands over its lobby actions once on load, before any lobby event can fire */
export function init(h: Handlers) {
  handlers = h;
}

export const liveLobby = (matchId: string) => cur()?.live.get(matchId);
export const liveConns = () => cur()?.conns.values() ?? [];

export function retire(l: Live) {
  l.lobby.removeAllListeners();
  l.lobby.channel.removeAllListeners("message");
  cur()?.live.delete(l.matchId);
}

export const coolingDown = (by: number) => (lastSent.get(by) ?? 0) + CHAT_GAP - Date.now() > 0;

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
  if (!cur())
    withEdition("site", () =>
      globalStore<State>(KEY, () => {
        console.log(`[bancho] state created pid=${process.pid}`);
        setInterval(sweepIdle, 30_000).unref();
        setInterval(syncIdle, 5_000).unref();
        // events can come from a bgcc6 view with the same match id; lobbies only follow the site edition
        onDraft((id) => withEdition("site", () => handlers?.react(id)));
        onRelay((osuId, up) => withEdition("site", () => (up ? void restoreOwner(osuId) : dropConn(osuId))));
        return { conns: new Map(), live: new Map(), bus: new EventEmitter().setMaxListeners(0), restored: false };
      }),
    );
  return cur() ?? null;
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
  const s = cur();
  const c = s?.conns.get(owner);
  if (!c) return;
  s!.conns.delete(owner);
  for (const l of [...s!.live.values()]) if (l.owner === owner) retire(l);
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
    clearWhere(ownedBy("ircLost", owner));
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
    // the game client on the same account leaving #mp parts irc too; rejoin, and only a lobby bancho dropped gets closed
    if (l && client.isConnected()) void rejoin(l);
  });
  return x;
}

async function ircLost(s: State, owner: number, why?: string) {
  await withEdition("site", async () => {
    for (const l of s.live.values()) {
      if (l.owner !== owner) continue;
      const match = await describeMatch(l.matchId);
      raise({ id: ownerAlertId("ircLost", l.matchId, owner), kind: "ircLost", level: "red", match, href: `/matches/${match.slug}`, detail: why }, { hosts: true, osuIds: [owner] });
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

export const ping = (matchId?: string) => cur()?.bus.emit("change", matchId ?? "*");

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
      await restore(s, r.matchId, r.mpId, owner).catch((e) => dropIfGone(r.matchId, e));
    }
  }
  return s;
}

async function restoreOwner(owner: number) {
  const s = state();
  if (!s) return;
  ping();
  const open = await db.select().from(mpLobbies).where(eq(mpLobbies.open, true));
  for (const r of open) if (ownerOf(r.owner) === owner && !s.live.has(r.matchId)) await restore(s, r.matchId, r.mpId, owner).catch((e) => dropIfGone(r.matchId, e));
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
  const rows = await db.select().from(mpChat).where(eq(mpChat.mpId, mpId)).orderBy(desc(mpChat.id)).limit(CHAT_KEEP).catch(() => []);
  return rows.reverse().map(chatLine);
}

export async function sayLocal(matchId: string, by: number, raw: string, side: 1 | 2 | null) {
  const text = cleanChat(raw);
  if (!text) return "empty" as const;
  if (blocked(text)) return "blocked" as const;
  if (coolingDown(by)) return "cooldown" as const;
  const l = cur()?.live.get(matchId);
  if (!l) return "closed" as const;
  lastSent.set(by, Date.now());
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, by)).limit(1);
  const line: ChatLine = { at: Date.now(), from: ircName(u?.username ?? String(by)), text, local: true, ...(side ? { side } : {}) };
  l.chat.push(line);
  if (l.chat.length > CHAT_KEEP) l.chat.splice(0, l.chat.length - CHAT_KEEP);
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
  quiet(matchId);
  await ch.lobby.updateSettings();
  ping(matchId);
}

async function rejoin(l: Live) {
  try {
    await l.lobby.channel.join();
    quiet(l.matchId);
    await l.lobby.updateSettings();
  } catch (e) {
    await dropIfGone(l.matchId, e);
  }
  ping(l.matchId);
}

// only a lobby bancho no longer has is closed; a failed login or slow reply keeps the row so the next relay "up" retries
async function dropIfGone(matchId: string, e: unknown) {
  console.error(`[bancho] restore ${matchId}`, e);
  if (/no such channel/i.test(e instanceof Error ? e.message : String(e))) await markClosed(matchId);
}

const IDLE = 10 * 60_000;

function sweepIdle() {
  const s = cur();
  if (!s) return;
  for (const l of s.live.values()) if (!l.lobby.playing && Date.now() - l.active > IDLE) void handlers?.closeLobby(l.matchId).catch(() => {});
}

const SYNC_GAP = 10_000;
const SYNC_IDLE = 15_000;
const NONCED = /^!mp (map|mods|lock|unlock|size|set|clearhost|close|start|timer|aborttimer|abort|settings)\b/;
const SETTINGS_LINE =/^(Room name:|Beatmap:|Team mode:|Active mods:|Players:|Slot \d+\s)/;
export const syncOf = (matchId: string) => synced.get(matchId) ?? synced.set(matchId, { last: 0, quietUntil: 0 }).get(matchId)!;

// restores and rejoins re-read settings; keep that dump out of the chat
const quiet = (matchId: string) => void (syncOf(matchId).quietUntil = Date.now() + 5_000);

function runSync(l: Live) {
  const s = syncOf(l.matchId);
  if (cur()?.live.get(l.matchId) !== l) return void synced.delete(l.matchId);
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
  for (const l of cur()?.live.values() ?? []) {
    const s = syncOf(l.matchId);
    if (!l.lobby.playing && l.lobby.slots.some(Boolean) && !s.timer && Date.now() - s.last >= SYNC_IDLE) runSync(l);
  }
}

const CMD_GAP = 750;

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
  lb.on("matchStarted", () => {
    playStart.set(l.matchId, Date.now());
    cuePlay(l.matchId);
  });
  for (const ev of ["matchFinished", "matchAborted"] as const) lb.on(ev as "matchStarted", () => void playStart.delete(l.matchId));
  lb.on("matchFinished", () => cueFinish(l.matchId));
  lb.on("matchAborted", () => cueAbort(l.matchId));
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
    if (l.chat.length > CHAT_KEEP) l.chat.splice(0, l.chat.length - CHAT_KEEP);
    const cmd = msg.message.trim().match(/^!mp\s+(timer|aborttimer)\b\s*(\d+)?/i);
    if (cmd) void timerBy(l.matchId, msg.self, msg.user.ircUsername).then((ok) => (ok ? lobbyTimer(l.matchId, cmd[1].toLowerCase() === "timer" ? Math.min(Number(cmd[2] ?? 30), 3600) || 30 : null) : undefined)).catch((e) => console.error("[bancho] timer", e));
    const play = msg.message.trim().match(/^!mp\s+(start|abort|aborttimer)\b\s*(\d+)?/i);
    if (play)
      void timerBy(l.matchId, msg.self, msg.user.ircUsername)
        .then((ok) => {
          if (!ok) return;
          if (play[1].toLowerCase() !== "start") return cueAbort(l.matchId);
          if (Number(play[2]) > 0) cueCountdown(l.matchId, Math.min(Number(play[2]), 3600));
        })
        .catch((e) => console.error("[bancho] start cue", e));
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
    } catch (e) {
      console.error("[bancho] seat", l.matchId, e);
    }
  });
}


async function timerBy(matchId: string, self: boolean, from: string) {
  if (self) return true;
  const [m] = await db.select({ referee: matches.referee }).from(matches).where(eq(matches.id, matchId)).limit(1);
  const refs = staffNames(m?.referee).map(nameKey);
  const hosts = (await getHosts()).map((h) => nameKey(h.username));
  return [...refs, ...hosts].includes(nameKey(from));
}

export async function markClosed(matchId: string) {
  console.log(`[bancho] closed ${matchId}`);
  const s = cur();
  const l = s?.live.get(matchId);
  if (l) retire(l);
  await db.update(mpLobbies).set({ open: false, closedAt: new Date() }).where(and(eq(mpLobbies.matchId, matchId), eq(mpLobbies.open, true)));
  clearWhere((a) => a.match?.id === matchId && (a.kind === "ircLost" || a.kind === "helperOffline"));
  ping(matchId);
}

type ScoreLine = { score: number; pass: boolean; team?: string; userId?: number };

async function onFinished(matchId: string, scores: ScoreLine[]) {
  const l = cur()?.live.get(matchId);
  if (!l) return null;
  const d = await getDraft(matchId);
  if (!d) return null;
  const picks = d.steps.filter((s) => s.kind === "pick" && !s.skip);
  const { maps } = await rulesOf(matchId, d.stageSlug);
  const idOf = (slot: string) => maps.find((m) => m.slot === slot)?.id;
  // the open pick, or a replay of the last decided one (its new result replaces the old)
  const pick = [picks.findLast((s) => !s.winner), l.lobby.beatmapId ? picks.findLast((s) => !!s.winner) : undefined].find(
    (s) => s && idOf(s.slot) && (!l.lobby.beatmapId || l.lobby.beatmapId === idOf(s.slot)),
  );
  if (!pick) return null;
  const sum = [0, 0];
  for (const s of scores) {
    const side = (s.userId && l.members.get(s.userId)) || (s.team === "Red" ? 1 : s.team === "Blue" ? 2 : null);
    if (side && s.pass !== false) sum[side - 1] += s.score;
  }
  if (sum[0] === sum[1]) return null;
  const winner = sum[0] > sum[1] ? 1 : 2;
  const r = await setResult(matchId, pick.slot, winner);
  if (typeof r === "string") return null;
  return { slot: pick.slot, winner, sum };
}

export const target = (p: { user: { id: number; ircUsername: string } }) => (p.user.id ? `#${p.user.id}` : ircName(p.user.ircUsername));

export async function swapSlots(l: Live, say: (m: string) => Promise<unknown>, from: number, to: number) {
  const lb = l.lobby;
  const me = lb.slots[from];
  if (!me || to === from) return;
  const cur = lb.size || lobbySize(getFormat());
  const there = lb.slots[to];
  const grow = to + 1 > cur ? to + 1 : 0;
  if (!there) {
    if (grow) await say(`!mp size ${grow}`);
    await say(`!mp move ${target(me)} ${to + 1}`);
    if (grow) await say(`!mp size ${cur}`);
    return;
  }
  let temp = lobbySize(getFormat());
  while (temp < 15 && (lb.slots[temp] || temp === from || temp === to)) temp++;
  const size = Math.max(cur, temp + 1);
  if (size !== cur) await say(`!mp size ${size}`);
  await say(`!mp move ${target(me)} ${temp + 1}`);
  await say(`!mp move ${target(there)} ${from + 1}`);
  await say(`!mp move ${target(me)} ${to + 1}`);
  if (size !== cur) await say(`!mp size ${cur}`);
}
