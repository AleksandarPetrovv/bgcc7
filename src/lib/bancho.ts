import "server-only";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { BanchoClient, BanchoLobbyPlayerStates, BanchoLobbyTeamModes, BanchoLobbyWinConditions, type BanchoLobby, type BanchoLobbyPlayerScore, type BanchoMultiplayerChannel } from "bancho.js";
import { RateLimiterMemory, RateLimiterQueue } from "rate-limiter-flexible";
import { db, withEdition } from "@/db";
import { matches, mpChat, mpLobbies, staff, users } from "@/db/schema";
import { getAllTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getFormat } from "@/db/edition";
import { getDraft, lobbyTimer, onDraft, poolSlots, setResult } from "@/db/drafts";
import { other, rollWinner, scoreOf, turnOf, type DraftView } from "@/lib/draft";
import { getUser } from "@/lib/osu-api";
import { lobbySize } from "@/lib/format";
import { blocked } from "@/lib/chat-filter";
import { onRelay, relayName, relaySocket } from "@/lib/relay";

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
};

type Conn = { client: BanchoClient; ready: Promise<unknown> | null; owner: number };
export type ChatLine = { at: number; from: string; text: string; ref?: boolean; local?: boolean; side?: 1 | 2 };
type Live = {
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
type State = { conns: Map<number, Conn>; live: Map<string, Live>; bus: EventEmitter; restored: boolean };

const g = globalThis as unknown as { bgccIrc?: State };

const apiKey = () => process.env.OSU_API_V1_KEY || null;

const creds = (owner: number) => {
  const key = apiKey();
  if (!key) return null;
  const name = relayName(owner);
  return name ? { username: name, password: "relay", apiKey: key } : null;
};

export const canLobby = (osuId: number) => !!creds(osuId);

const ownerOf = (owner: string) => Number(owner) || 0;

function state(): State | null {
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

function conn(owner: number): Conn | null {
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

type Sock = { client: unknown; onClose: (e: Error) => void; handleIrcCommand: (c: string) => void; emit: (ev: string, e: Error) => void; initSocket: () => void };

function newConn(s: State, c: NonNullable<ReturnType<typeof creds>>, owner: number): Conn {
  const client = new BanchoClient({ username: c.username, password: c.password, apiKey: c.apiKey, rateLimiter: new RateLimiterQueue(new RateLimiterMemory({ points: 9, duration: 5.5 })) as never });
  (client as unknown as Sock).initSocket = function (this: Sock) {
    const sock = relaySocket(owner);
    this.client = sock;
    sock.on("error", (e: Error) => this.onClose(e));
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
    ping();
  });
  client.on("disconnected", (e) => {
    console.log(`${tag} disconnected: ${e?.message ?? "?"}`);
    ping();
  });
  client.on("PART", (m) => {
    if (!m.user.isClient()) return;
    const l = [...s.live.values()].find((v) => v.owner === owner && `#mp_${v.mpId}` === m.channel.name);
    if (l) void markClosed(l.matchId);
  });
  return x;
}

async function online(owner: number) {
  const c = conn(owner);
  if (!c) throw new Error("irc off");
  if (!c.client.isConnected()) {
    c.ready ??= withEdition("site", () => c.client.connect()).finally(() => (c.ready = null));
    await c.ready;
  }
  return c;
}

const ping = (matchId?: string) => g.bgccIrc?.bus.emit("change", matchId ?? "*");

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

async function membersOf(matchId: string) {
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
  return rows.reverse().map((r) => ({ at: r.at.getTime(), from: r.from, text: r.text, ...(r.local ? { local: true } : {}), ...(r.side === 1 || r.side === 2 ? { side: r.side } : {}) }));
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
  await db.insert(mpChat).values({ matchId, mpId: l.mpId, at: new Date(line.at), from: line.from, text, local: true, side }).catch((e) => console.error("[bancho] chat save", e));
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

export type ScoreLine = { score: number; pass: boolean; team?: string; userId?: number };

export async function onFinished(matchId: string, scores: ScoreLine[]) {
  const l = g.bgccIrc?.live.get(matchId);
  if (!l) return null;
  const d = await getDraft(matchId);
  const pick = d?.steps.findLast((s) => s.kind === "pick" && !s.skip && !s.winner);
  if (!d || !pick) return null;
  const map = (await getPoolStages()).find((s) => s.slug === d.stageSlug)?.pools.flatMap((p) => p.maps).find((m) => m.slot === pick.slot);
  if (!map || (l.lobby.beatmapId && l.lobby.beatmapId !== map.id)) return null;
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

function react(matchId: string) {
  const l = g.bgccIrc?.live.get(matchId);
  if (!l) return;
  l.active = Date.now();
  const snap = getDraft(matchId);
  l.queue = l.queue.then(async () => narrate(l, await snap)).catch((e) => console.error("[bancho] narrate", e));
}

async function narrate(l: Live, n: DraftView | null) {
  const p = l.seen;
  l.seen = n;
  if (!n || !p || g.bgccIrc?.live.get(l.matchId) !== l) return;
  const name = (s: 1 | 2) => l.names[s - 1];
  const say = (text: string) => l.lobby.channel.sendMessage(text).catch(() => {});
  const slots = await poolSlots(n.stageSlug);

  if ((n.roll1 != null && n.roll1 !== p.roll1) || (n.roll2 != null && n.roll2 !== p.roll2)) await new Promise((r) => setTimeout(r, 2000));
  for (const s of [1, 2] as const) {
    const v = s === 1 ? n.roll1 : n.roll2;
    if (v != null && v !== (s === 1 ? p.roll1 : p.roll2)) await say(`${name(s)} rolled ${v}`);
  }
  if (n.roll1 != null && n.roll2 != null && (n.roll1 !== p.roll1 || n.roll2 !== p.roll2)) {
    const w = rollWinner(n);
    await say(`Rolls: ${name(1)} ${n.roll1} · ${name(2)} ${n.roll2}, ${w ? `${name(w)} wins the roll` : "Tie, roll again"}`);
  }
  if (!p.choice && n.choice) {
    const w = rollWinner(n);
    if (w) await say(n.choice === "pick" ? `${name(w)} picks first, ${name(other(w))} bans first` : `${name(w)} bans first, ${name(other(w))} picks first`);
  }

  const same = n.steps.length >= p.steps.length && p.steps.every((s, i) => s.slot === n.steps[i].slot && s.kind === n.steps[i].kind);
  if (same) {
    if (p.steps.some((s, i) => !s.winner && n.steps[i].winner)) {
      const [a, b] = scoreOf(n);
      if (n.firstTo && (a >= n.firstTo || b >= n.firstTo)) {
        const w = a > b ? 1 : 2;
        await say(`${name(w)} wins ${Math.max(a, b)} - ${Math.min(a, b)}, GG!`);
      } else {
        const t = turnOf(n, slots);
        await say(`${name(1)} ${a} - ${b} ${name(2)}${t.kind === "pick" ? ` | Next pick: ${name(t.team)}` : ""}`);
      }
    }
    for (const s of n.steps.slice(p.steps.length)) {
      if (s.skip) await say(`${name(s.team)} ran out of time, ${s.kind} passes to ${name(other(s.team))}`);
      else if (s.kind === "ban") await say(`${name(s.team)} banned ${s.slot}`);
      else {
        if (!s.auto) await say(`${name(s.team)} picked ${s.slot}`);
        await lobbyPick(l.matchId, n.stageSlug, s.slot).catch(() => {});
      }
    }
  }
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
const syncOf = (matchId: string) => synced.get(matchId) ?? synced.set(matchId, { last: 0, quietUntil: 0 }).get(matchId)!;

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

function attach(l: Live) {
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
    const line = { at: Date.now(), from: msg.user.ircUsername, text: shown.slice(0, 1000) };
    l.chat.push(line);
    void db
      .insert(mpChat)
      .values({ matchId: l.matchId, mpId: l.mpId, at: new Date(line.at), from: line.from, text: line.text })
      .catch((e) => console.error("[bancho] chat save", e));
    if (l.chat.length > 150) l.chat.splice(0, l.chat.length - 150);
    const cmd = msg.message.trim().match(/^!mp\s+(timer|aborttimer)\b\s*(\d+)?/i);
    if (cmd) void lobbyTimer(l.matchId, cmd[1].toLowerCase() === "timer" ? Math.min(Number(cmd[2] ?? 30), 3600) || 30 : null).catch((e) => console.error("[bancho] timer", e));
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

async function markClosed(matchId: string) {
  console.log(`[bancho] closed ${matchId}`);
  const s = g.bgccIrc;
  const l = s?.live.get(matchId);
  if (l) {
    l.lobby.removeAllListeners();
    l.lobby.channel.removeAllListeners("message");
    s!.live.delete(matchId);
  }
  await db.update(mpLobbies).set({ open: false, closedAt: new Date() }).where(and(eq(mpLobbies.matchId, matchId), eq(mpLobbies.open, true)));
  ping(matchId);
}

const READY = new Map<symbol, LobbySlot["ready"]>([
  [BanchoLobbyPlayerStates.Ready as symbol, "ready"],
  [BanchoLobbyPlayerStates.NotReady as symbol, "notready"],
  [BanchoLobbyPlayerStates.NoMap as symbol, "nomap"],
]);

export async function lobbyView(matchId: string, viewer?: number): Promise<LobbyView> {
  const [row] = await db.select().from(mpLobbies).where(eq(mpLobbies.matchId, matchId)).limit(1);
  const owner = row?.open ? ownerOf(row.owner) : null;
  const who = owner ?? viewer;
  const c = state() && who ? conn(who) : null;
  const status: LobbyView["bot"] = !c ? "off" : c.client.isConnected() ? "online" : "connecting";
  const mine = viewer != null && (owner != null ? owner === viewer : canLobby(viewer));
  const base: LobbyView = { bot: status, state: row ? (row.open ? "open" : "closed") : "none", mpId: row?.mpId ?? null, password: row?.password ?? "", size: 0, slots: [], mapId: null, mapName: null, mods: [], freemod: false, playing: false, chat: [], owner, ...(viewer != null ? { mine } : {}) };
  const l = g.bgccIrc?.live.get(matchId);
  if (!l || !row?.open) return base;
  const lb = l.lobby;
  const size = Math.max(lobbySize(getFormat()) + 1, ...lb.slots.map((p, i) => (p ? i + 1 : 0)));
  const refs = await refNames();
  return {
    ...base,
    size,
    spare: (lb.size ?? 0) > lobbySize(getFormat()),
    slots: Array.from({ length: size }, (_, i) => {
      const p = lb.slots[i];
      if (!p) return null;
      const id = p.user.id || null;
      return {
        slot: i,
        name: p.user.username || p.user.ircUsername,
        id,
        side: id ? (l.members.get(id) ?? null) : null,
        team: p.team === "Red" ? "red" : p.team === "Blue" ? "blue" : null,
        ready: READY.get(p.state as symbol) ?? "notready",
        host: p.isHost,
        mods: (p.mods ?? []).map((m) => m.shortMod.toUpperCase()),
      };
    }),
    mapId: lb.beatmapId || null,
    mapName: lb.beatmap && lb.beatmap.id == lb.beatmapId ? `${lb.beatmap.artist} - ${lb.beatmap.title} [${lb.beatmap.version}]` : null,
    mods: (lb.mods ?? []).map((m) => m.shortMod.toUpperCase()),
    freemod: !!lb.freemod,
    playing: !!lb.playing,
    chat: l.chat.slice(-100).map((c) => (refs.has(nameKey(c.from)) ? { ...c, ref: true } : c)),
  };
}

const nameKey = (n: string) => n.toLowerCase().replace(/ /g, "_");
let refCache: { at: number; names: Set<string> } | null = null;

async function refNames() {
  if (refCache && Date.now() - refCache.at < 60_000) return refCache.names;
  const rows = await db
    .select({ username: users.username, roles: staff.permRoles })
    .from(staff)
    .innerJoin(users, eq(users.osuId, staff.osuId))
    .catch(() => []);
  const names = new Set(rows.filter((r) => r.roles.some((x) => x === "host" || x === "referee")).map((r) => nameKey(r.username)));
  for (const c of g.bgccIrc?.conns.values() ?? []) names.add(nameKey(c.client.getSelf().ircUsername));
  refCache = { at: Date.now(), names };
  return names;
}

async function liveOf(matchId: string) {
  const s = await ensureBot();
  const l = s?.live.get(matchId);
  if (!l) throw new Error("no lobby");
  return l;
}

async function lobbyAs(matchId: string) {
  const l = await liveOf(matchId);
  return { l, lb: l.lobby };
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function makeLobby(matchId: string, by: number) {
  const s = await ensureBot();
  if (!s) throw new Error("irc off");
  const [cur] = await db.select().from(mpLobbies).where(eq(mpLobbies.matchId, matchId)).limit(1);
  if (cur?.open && s.live.has(matchId)) return { mpId: cur.mpId };
  const { match, teams, map, seats, names, seen } = await membersOf(matchId);
  if (!match?.team1Id || !match.team2Id) throw new Error("teams missing");
  const c = await online(by);
  const name = (id: string) => clip(teams.find((t) => t.id === id)?.name ?? "TBD", 20);
  const ch = await c.client.createLobby(`${getFormat().name}: (${name(match.team1Id)}) vs (${name(match.team2Id)})`);
  const lb = ch.lobby;
  const l: Live = { matchId, owner: by, mpId: lb.id, lobby: lb, members: map, seats, placed: new Set(), chat: [], names, seen, queue: Promise.resolve(), active: Date.now() };
  attach(l);
  s.live.set(matchId, l);
  const password = randomBytes(4).toString("hex");
  await db
    .insert(mpLobbies)
    .values({ matchId, mpId: lb.id, password, owner: String(by), createdBy: by })
    .onConflictDoUpdate({ target: mpLobbies.matchId, set: { mpId: lb.id, password, owner: String(by), open: true, createdBy: by, createdAt: new Date(), closedAt: null } });
  const ids = (match.mpLinks || "").split(",").filter(Boolean);
  if (!ids.includes(String(lb.id))) await db.update(matches).set({ mpLinks: [...ids, String(lb.id)].join(",") }).where(eq(matches.id, matchId));
  ping(matchId);
  await lb.setPassword(password);
  await lb.setSettings(BanchoLobbyTeamModes.TeamVs, BanchoLobbyWinConditions.ScoreV2, lobbySize(getFormat()));
  await lb.channel.sendMessage("!mp lock");
  const refNames = (match.referee ?? "").split(/[,&/]| and /).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const known = refNames.length ? await db.select({ osuId: users.osuId }).from(users).where(inArray(sql`lower(${users.username})`, refNames)) : [];
  await lb.addRef([...new Set([by, ...known.map((u) => u.osuId)])].map((id) => `#${id}`)).catch(() => {});
  for (const id of map.keys()) await lb.invitePlayer(`#${id}`).catch(() => {});
  await lb.updateSettings().catch(() => {});
  ping(matchId);
  return { mpId: lb.id };
}

export async function inviteMissing(matchId: string) {
  const { l, lb } = await lobbyAs(matchId);
  const inside = new Set(l.lobby.slots.flatMap((p) => (p?.user.id ? [p.user.id] : [])));
  for (const id of l.members.keys()) if (!inside.has(id)) await lb.invitePlayer(`#${id}`).catch(() => {});
}

export async function refreshLobby(matchId: string) {
  const l = await liveOf(matchId);
  Object.assign(syncOf(matchId), { last: Date.now(), quietUntil: 0 });
  await l.lobby.updateSettings();
  ping(matchId);
}

export async function startLobby(matchId: string, by: number, secs: number) {
  const { lb } = await lobbyAs(matchId);
  await lb.startMatch(secs > 0 ? secs : undefined);
}

export async function abortLobby(matchId: string) {
  const { lb } = await lobbyAs(matchId);
  await lb.abortMatch();
}

const lastSent = new Map<number, number>();
const typed = new Map<string, number>();
const playStart = new Map<string, number>();

export function nowPlaying(matchId: string) {
  const l = g.bgccIrc?.live.get(matchId);
  if (!l?.lobby.playing) return null;
  if (!playStart.has(matchId)) playStart.set(matchId, Date.now());
  return { at: playStart.get(matchId)!, mapId: l.lobby.beatmapId ?? 0 };
}

async function poolMap(matchId: string, text: string) {
  const ref = text.match(/^!mp addref\s+(.+)$/i);
  if (ref) {
    const who = ref[1].trim().replace(/^#/, "");
    if (/^\d+$/.test(who)) return { text: `!mp addref #${who}`, mod: undefined };
    const u = await getUser(who, "username").catch(() => null);
    return u ? { text: `!mp addref #${u.id}`, mod: undefined } : ("nouser" as const);
  }
  const m = text.match(/^!mp map\s+(\S+)(.*)$/i);
  if (!m) return { text, mod: undefined };
  const d = await getDraft(matchId);
  const [match] = d ? [] : await db.select({ stageSlug: matches.stageSlug, poolSlug: matches.poolSlug }).from(matches).where(eq(matches.id, matchId)).limit(1);
  const stage = d?.stageSlug ?? match?.poolSlug ?? match?.stageSlug;
  const maps = (await getPoolStages()).find((s) => s.slug === stage)?.pools.flatMap((p) => p.maps) ?? [];
  const byId = /^\d+$/.test(m[1]);
  const map = maps.find((x) => (byId ? x.id === Number(m[1]) : x.slot.toLowerCase() === m[1].toLowerCase()));
  if (!map) return byId ? { text, mod: undefined } : ("noslot" as const);
  return { text: `!mp map ${map.id}${m[2]}`, mod: map.mod };
}

const modArgs = (mod: string) => (MOD_ARGS[mod] ? [MOD_ARGS[mod], false] : ["NF", true]) as [string, boolean];

export const CHAT_GAP = 1500;

export async function sendChat(matchId: string, by: number, raw: string) {
  const hit = await poolMap(matchId, raw.replace(/[\r\n]+/g, " ").trim().slice(0, 300));
  if (typeof hit === "string") return hit;
  const text = hit.text;
  if (!text) return "empty" as const;
  const wait = (lastSent.get(by) ?? 0) + CHAT_GAP - Date.now();
  if (wait > 0) return "cooldown" as const;
  lastSent.set(by, Date.now());
  const { l, lb } = await lobbyAs(matchId);
  if (l.owner !== by) return "forbidden" as const;
  for (const [k, at] of typed) if (Date.now() - at > 60_000) typed.delete(k);
  typed.set(`${matchId}|${text}`, Date.now());
  await lb.channel.sendMessage(text);
  if (hit.mod) await lb.setMods(...modArgs(hit.mod)).catch(() => {});
  return "ok" as const;
}

const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

export async function closeLobby(matchId: string) {
  const s = await ensureBot().catch(() => null);
  try {
    if (s?.live.has(matchId)) {
      const { lb } = await lobbyAs(matchId);
      await within(lb.channel.sendMessage("!mp close"), 8000);
    } else {
      const [row] = await db.select().from(mpLobbies).where(eq(mpLobbies.matchId, matchId)).limit(1);
      if (row?.open) {
        const c = await online(ownerOf(row.owner));
        const ch = c.client.getChannel(`#mp_${row.mpId}`);
        await within(ch.join().then(() => ch.sendMessage("!mp close")), 8000);
      }
    }
  } catch {}
  await markClosed(matchId);
}

const HANDOFF = 5 * 60_000;

export async function handOff(matchId: string, referee: string | null) {
  const owner = await lobbyOwner(matchId);
  if (!owner) return;
  const [ref] = referee ? await db.select({ osuId: users.osuId }).from(users).where(sql`lower(${users.username}) = ${referee.trim().toLowerCase()}`).limit(1) : [];
  if (ref?.osuId === owner) return;
  await db.update(mpLobbies).set({ open: false, closedAt: new Date() }).where(and(eq(mpLobbies.matchId, matchId), eq(mpLobbies.open, true)));
  const s = g.bgccIrc;
  const l = s?.live.get(matchId);
  if (l) {
    l.lobby.removeAllListeners();
    l.lobby.channel.removeAllListeners("message");
    s!.live.delete(matchId);
    const say = (m: string) => l.lobby.channel.sendMessage(m).catch(() => {});
    void say("The referee changed. This lobby closes in 5 minutes, a new invite is on its way.");
    setTimeout(() => void within(say("!mp close"), 8000), HANDOFF).unref();
  }
  console.log(`[bancho] handoff ${matchId} from ${owner}`);
  ping(matchId);
}

const target = (p: { user: { id: number; ircUsername: string } }) => (p.user.id ? `#${p.user.id}` : p.user.ircUsername.replace(/ /g, "_"));

async function slotPlayer(matchId: string, by: number, slot: number) {
  const { l, lb } = await lobbyAs(matchId);
  const p = l.lobby.slots[slot];
  if (!p) throw new Error("empty slot");
  return { l, say: (m: string) => lb.channel.sendMessage(m), who: target(p) };
}

const SIMPLE = { aborttimer: "!mp aborttimer" } as const;
export type SimpleCmd = keyof typeof SIMPLE;

export async function simpleCmd(matchId: string, by: number, cmd: SimpleCmd) {
  const { lb } = await lobbyAs(matchId);
  await lb.channel.sendMessage(SIMPLE[cmd]);
}

export async function kickSlot(matchId: string, by: number, slot: number) {
  const { say, who } = await slotPlayer(matchId, by, slot);
  await say(`!mp kick ${who}`);
}

export async function teamSlot(matchId: string, by: number, slot: number, team: "red" | "blue") {
  const { say, who } = await slotPlayer(matchId, by, slot);
  await say(`!mp team ${who} ${team}`);
}

async function swapSlots(l: Live, say: (m: string) => Promise<unknown>, from: number, to: number) {
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

export async function moveSlot(matchId: string, by: number, from: number, to: number) {
  const { l, say } = await slotPlayer(matchId, by, from);
  if (to < 0 || to > lobbySize(getFormat())) return;
  await swapSlots(l, say, from, to);
}

export async function spareSlot(matchId: string, by: number, open: boolean) {
  const { lb } = await lobbyAs(matchId);
  const base = lobbySize(getFormat());
  await lb.channel.sendMessage(`!mp size ${open ? base + 1 : base}`);
}

const MOD_ARGS: Record<string, string> = { NoMod: "NF", Hidden: "HD NF", HardRock: "HR NF", DoubleTime: "DT NF" };

export async function lobbyPick(matchId: string, stageSlug: string, slot: string) {
  if (!g.bgccIrc?.live.has(matchId)) return;
  const map = (await getPoolStages()).find((s) => s.slug === stageSlug)?.pools.flatMap((p) => p.maps).find((m) => m.slot === slot);
  if (!map) return;
  const l = await liveOf(matchId);
  if (l.lobby.beatmapId !== map.id) await l.lobby.setMap(map.id, 0);
  await l.lobby.setMods(...modArgs(map.mod));
  ping(matchId);
}
