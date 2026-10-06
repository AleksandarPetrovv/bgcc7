import "server-only";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { BanchoClient, BanchoLobbyPlayerStates, BanchoLobbyTeamModes, BanchoLobbyWinConditions, type BanchoLobby, type BanchoLobbyPlayerScore, type BanchoMultiplayerChannel } from "bancho.js";
import { RateLimiterMemory, RateLimiterQueue } from "rate-limiter-flexible";
import { db } from "@/db";
import { matches, mpChat, mpLobbies, users } from "@/db/schema";
import { getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getFormat } from "@/db/edition";
import { getDraft, lobbyTimer, onDraft, poolSlots, setResult } from "@/db/drafts";
import { other, rollWinner, scoreOf, turnOf, type DraftView } from "@/lib/draft";

export type LobbySlot = { slot: number; name: string; id: number | null; side: 1 | 2 | null; team: "red" | "blue" | null; ready: "ready" | "notready" | "nomap"; host: boolean };
export type LobbyView = {
  bot: "off" | "connecting" | "online";
  state: "none" | "open" | "closed";
  mpId: number | null;
  password: string;
  size: number;
  slots: (LobbySlot | null)[];
  mapId: number | null;
  mapName: string | null;
  mods: string[];
  freemod: boolean;
  playing: boolean;
  chat: ChatLine[];
};

type Kind = "personal" | "bot";
type Conn = { kind: Kind; client: BanchoClient; ready: Promise<unknown> | null };
export type ChatLine = { at: number; from: string; text: string };
type Live = {
  matchId: string;
  mpId: number;
  owner: Kind;
  lobby: BanchoLobby;
  members: Map<number, 1 | 2>;
  chat: ChatLine[];
  names: [string, string];
  seen: DraftView | null;
  queue: Promise<unknown>;
  active: number;
};
type State = { conns: Partial<Record<Kind, Conn>>; live: Map<string, Live>; bus: EventEmitter; restored: boolean };

const g = globalThis as unknown as { bgccIrc?: State };

const creds = (kind: Kind) => {
  const e = process.env;
  const [u, p] = kind === "personal" ? [e.OSU_IRC_USERNAME, e.OSU_IRC_PASSWORD] : [e.OSU_BOT_IRC_USERNAME, e.OSU_BOT_IRC_PASSWORD];
  return u && p && e.OSU_API_V1_KEY ? { username: u, password: p, apiKey: e.OSU_API_V1_KEY } : null;
};

export const botConfigured = () => !!creds("personal");

function state(): State | null {
  if (!botConfigured()) return null;
  if (!g.bgccIrc) {
    g.bgccIrc = { conns: {}, live: new Map(), bus: new EventEmitter().setMaxListeners(0), restored: false };
    console.log(`[bancho] state created pid=${process.pid}`);
    setInterval(sweepIdle, 30_000).unref();
    onDraft((id) => react(id));
  }
  return g.bgccIrc;
}

function conn(kind: Kind): Conn | null {
  const s = state();
  const c = creds(kind);
  if (!s || !c) return null;
  const cur = s.conns[kind];
  if (cur) return cur;
  const client = new BanchoClient(kind === "bot" ? { ...c, botAccount: true } : { ...c, rateLimiter: new RateLimiterQueue(new RateLimiterMemory({ points: 9, duration: 5.5 })) as never });
  const x: Conn = { kind, client, ready: null };
  client.on("error", (e) => console.error(`[bancho ${kind}]`, e.message));
  console.log(`[bancho ${kind}] new client pid=${process.pid}`);
  client.on("connected", () => {
    console.log(`[bancho ${kind}] connected`);
    for (const l of s.live.values()) if (l.owner === kind) void rejoin(l);
    ping();
  });
  client.on("disconnected", (e) => {
    console.log(`[bancho ${kind}] disconnected: ${e?.message ?? "?"}`);
    ping();
  });
  client.on("PART", (m) => {
    if (!m.user.isClient()) return;
    const l = [...s.live.values()].find((v) => v.owner === kind && `#mp_${v.mpId}` === m.channel.name);
    if (l) void markClosed(l.matchId);
  });
  s.conns[kind] = x;
  return x;
}

async function online(kind: Kind) {
  const c = conn(kind);
  if (!c) throw new Error("irc off");
  if (!c.client.isConnected()) {
    c.ready ??= c.client.connect().finally(() => (c.ready = null));
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

export async function kindFor(osuId: number | null): Promise<Kind> {
  if (!creds("bot")) return "personal";
  if (osuId == null) return "bot";
  const [u] = await db.select({ username: users.username }).from(users).where(eq(users.osuId, osuId)).limit(1);
  return u?.username.toLowerCase() === process.env.OSU_IRC_USERNAME?.toLowerCase() ? "personal" : "bot";
}

export async function ensureBot() {
  const s = state();
  if (!s) return null;
  if (!s.restored) {
    s.restored = true;
    const open = await db.select().from(mpLobbies).where(eq(mpLobbies.open, true));
    for (const r of open) {
      const owner: Kind = r.owner === "bot" ? "bot" : "personal";
      if (!s.live.has(r.matchId)) await restore(s, r.matchId, r.mpId, owner).catch(() => markClosed(r.matchId));
    }
  }
  return s;
}

async function membersOf(matchId: string) {
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  const teams = await getTeams();
  const map = new Map<number, 1 | 2>();
  for (const [tid, side] of [[m?.team1Id, 1], [m?.team2Id, 2]] as const) for (const p of teams.find((t) => t.id === tid)?.players ?? []) map.set(p.userId, side);
  const nm = (id: string | null | undefined) => teams.find((t) => t.id === id)?.name ?? "TBD";
  return { match: m, teams, map, names: [nm(m?.team1Id), nm(m?.team2Id)] as [string, string], seen: await getDraft(matchId) };
}

async function history(mpId: number): Promise<ChatLine[]> {
  const rows = await db.select().from(mpChat).where(eq(mpChat.mpId, mpId)).orderBy(desc(mpChat.id)).limit(150).catch(() => []);
  return rows.reverse().map((r) => ({ at: r.at.getTime(), from: r.from, text: r.text }));
}

async function restore(s: State, matchId: string, mpId: number, owner: Kind) {
  console.log(`[bancho] restore ${matchId} mp ${mpId}`);
  const c = await online(owner);
  const ch = c.client.getChannel(`#mp_${mpId}`) as BanchoMultiplayerChannel;
  await ch.join();
  const { map, names, seen } = await membersOf(matchId);
  const l: Live = { matchId, mpId, owner, lobby: ch.lobby, members: map, chat: await history(mpId), names, seen, queue: Promise.resolve(), active: Date.now() };
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
    await say(`Rolls: ${name(1)} ${n.roll1} · ${name(2)} ${n.roll2}, ${w ? `${name(w)} wins the roll` : "tie, roll again"}`);
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
        await say(`${name(1)} ${a} - ${b} ${name(2)}${t.kind === "pick" ? ` | next pick: ${name(t.team)}` : ""}`);
      }
    }
    if (p.pausedAt && !n.pausedAt) {
      const t = turnOf(n, slots);
      await say(t.kind === "pick" || t.kind === "ban" ? `Back on, ${name(t.team)} to ${t.kind}` : "Back on");
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
  for (const l of s.live.values()) if (!l.lobby.playing && Date.now() - l.active > IDLE) void closeLobby(l.matchId, null).catch(() => {});
}

function attach(l: Live) {
  const lb = l.lobby;
  const up = () => {
    l.active = Date.now();
    ping(l.matchId);
  };
  for (const ev of ["playerJoined", "playerLeft", "playerMoved", "playerChangedTeam", "host", "hostCleared", "matchStarted", "matchFinished", "matchAborted", "beatmapId", "beatmap", "mods", "freemod", "size", "allPlayersReady", "matchSettings"] as const) lb.on(ev as "matchStarted", up);
  lb.channel.on("message", (msg) => {
    const line = { at: Date.now(), from: msg.user.ircUsername, text: msg.message.slice(0, 1000) };
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

export async function lobbyView(matchId: string, osuId: number | null): Promise<LobbyView> {
  const c = state() ? conn(await kindFor(osuId)) : null;
  const status: LobbyView["bot"] = !c ? "off" : c.client.isConnected() ? "online" : "connecting";
  const [row] = await db.select().from(mpLobbies).where(eq(mpLobbies.matchId, matchId)).limit(1);
  const base: LobbyView = { bot: status, state: row ? (row.open ? "open" : "closed") : "none", mpId: row?.mpId ?? null, password: row?.password ?? "", size: 0, slots: [], mapId: null, mapName: null, mods: [], freemod: false, playing: false, chat: [] };
  const l = g.bgccIrc?.live.get(matchId);
  if (!l || !row?.open) return base;
  const lb = l.lobby;
  const size = Math.max(getFormat().teamSize * 2, ...lb.slots.map((p, i) => (p ? i + 1 : 0)));
  return {
    ...base,
    size,
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
      };
    }),
    mapId: lb.beatmapId || null,
    mapName: lb.beatmap && lb.beatmap.id == lb.beatmapId ? `${lb.beatmap.artist} - ${lb.beatmap.title} [${lb.beatmap.version}]` : null,
    mods: (lb.mods ?? []).map((m) => m.shortMod.toUpperCase()),
    freemod: !!lb.freemod,
    playing: !!lb.playing,
    chat: l.chat.slice(-100),
  };
}

async function liveOf(matchId: string) {
  const s = await ensureBot();
  const l = s?.live.get(matchId);
  if (!l) throw new Error("no lobby");
  return l;
}

async function lobbyAs(matchId: string, osuId: number | null) {
  const l = await liveOf(matchId);
  const kind = await kindFor(osuId);
  if (kind === l.owner) return { l, lb: l.lobby };
  const c = await online(kind);
  const ch = c.client.getChannel(`#mp_${l.mpId}`) as BanchoMultiplayerChannel;
  if (!(ch as unknown as { joined: boolean }).joined) {
    await l.lobby.addRef(c.client.getSelf().ircUsername).catch(() => {});
    await ch.join();
  }
  return { l, lb: ch.lobby };
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function makeLobby(matchId: string, by: number) {
  const s = await ensureBot();
  if (!s) throw new Error("irc off");
  const [cur] = await db.select().from(mpLobbies).where(eq(mpLobbies.matchId, matchId)).limit(1);
  if (cur?.open && s.live.has(matchId)) return { mpId: cur.mpId };
  const { match, teams, map, names, seen } = await membersOf(matchId);
  if (!match?.team1Id || !match.team2Id) throw new Error("teams missing");
  const owner = await kindFor(by);
  const c = await online(owner);
  const name = (id: string) => clip(teams.find((t) => t.id === id)?.name ?? "TBD", 20);
  const ch = await c.client.createLobby(`BGCC7: (${name(match.team1Id)}) vs (${name(match.team2Id)})`);
  const lb = ch.lobby;
  const l: Live = { matchId, mpId: lb.id, owner, lobby: lb, members: map, chat: [], names, seen, queue: Promise.resolve(), active: Date.now() };
  attach(l);
  s.live.set(matchId, l);
  const password = randomBytes(4).toString("hex");
  await db
    .insert(mpLobbies)
    .values({ matchId, mpId: lb.id, password, owner, createdBy: by })
    .onConflictDoUpdate({ target: mpLobbies.matchId, set: { mpId: lb.id, password, owner, open: true, createdBy: by, createdAt: new Date(), closedAt: null } });
  const ids = (match.mpLinks || "").split(",").filter(Boolean);
  if (!ids.includes(String(lb.id))) await db.update(matches).set({ mpLinks: [...ids, String(lb.id)].join(",") }).where(eq(matches.id, matchId));
  ping(matchId);
  await lb.setPassword(password);
  await lb.setSettings(BanchoLobbyTeamModes.TeamVs, BanchoLobbyWinConditions.ScoreV2, getFormat().teamSize * 2);
  await lb.channel.sendMessage("!mp lock");
  const refNames = (match.referee ?? "").split(/[,&/]| and /).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const known = refNames.length ? await db.select({ osuId: users.osuId }).from(users).where(inArray(sql`lower(${users.username})`, refNames)) : [];
  const otherAcc = creds(owner === "bot" ? "personal" : "bot")?.username;
  await lb.addRef([...[...new Set([by, ...known.map((u) => u.osuId)])].map((id) => `#${id}`), ...(otherAcc ? [otherAcc] : [])]).catch(() => {});
  for (const id of map.keys()) await lb.invitePlayer(`#${id}`).catch(() => {});
  await lb.updateSettings().catch(() => {});
  ping(matchId);
  return { mpId: lb.id, via: owner };
}

export async function inviteMissing(matchId: string, by: number) {
  const { l, lb } = await lobbyAs(matchId, by);
  const inside = new Set(l.lobby.slots.flatMap((p) => (p?.user.id ? [p.user.id] : [])));
  for (const id of l.members.keys()) if (!inside.has(id)) await lb.invitePlayer(`#${id}`).catch(() => {});
}

export async function refreshLobby(matchId: string) {
  const l = await liveOf(matchId);
  await l.lobby.updateSettings();
  ping(matchId);
}

export async function startLobby(matchId: string, by: number, secs: number) {
  const { lb } = await lobbyAs(matchId, by);
  await lb.startMatch(secs > 0 ? secs : undefined);
}

export async function abortLobby(matchId: string, by: number) {
  const { lb } = await lobbyAs(matchId, by);
  await lb.abortMatch();
}

const lastSent = new Map<number, number>();
export const CHAT_GAP = 1500;

export async function sendChat(matchId: string, by: number, raw: string) {
  const text = raw.replace(/[\r\n]+/g, " ").trim().slice(0, 300);
  if (!text) return "empty" as const;
  const wait = (lastSent.get(by) ?? 0) + CHAT_GAP - Date.now();
  if (wait > 0) return "cooldown" as const;
  lastSent.set(by, Date.now());
  const { lb } = await lobbyAs(matchId, by);
  const own = (await kindFor(by)) === "personal";
  const [u] = own || text.startsWith("!") ? [] : await db.select({ username: users.username }).from(users).where(eq(users.osuId, by)).limit(1);
  await lb.channel.sendMessage(u ? `[${u.username}] ${text}` : text);
  return "ok" as const;
}

const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

export async function closeLobby(matchId: string, by: number | null) {
  const s = await ensureBot().catch(() => null);
  try {
    if (s?.live.has(matchId)) {
      const { lb } = await lobbyAs(matchId, by);
      await within(lb.channel.sendMessage("!mp close"), 8000);
    } else {
      const [row] = await db.select().from(mpLobbies).where(eq(mpLobbies.matchId, matchId)).limit(1);
      if (row?.open) {
        const c = await online(row.owner === "bot" ? "bot" : "personal");
        const ch = c.client.getChannel(`#mp_${row.mpId}`);
        await within(ch.join().then(() => ch.sendMessage("!mp close")), 8000);
      }
    }
  } catch {}
  await markClosed(matchId);
}

const target = (p: { user: { id: number; ircUsername: string } }) => (p.user.id ? `#${p.user.id}` : p.user.ircUsername.replace(/ /g, "_"));

async function slotPlayer(matchId: string, by: number, slot: number) {
  const { l, lb } = await lobbyAs(matchId, by);
  const p = l.lobby.slots[slot];
  if (!p) throw new Error("empty slot");
  return { l, say: (m: string) => lb.channel.sendMessage(m), who: target(p) };
}

export async function hostSlot(matchId: string, by: number, slot: number) {
  const { say, who } = await slotPlayer(matchId, by, slot);
  await say(`!mp host ${who}`);
}

const SIMPLE = { aborttimer: "!mp aborttimer" } as const;
export type SimpleCmd = keyof typeof SIMPLE;

export async function simpleCmd(matchId: string, by: number, cmd: SimpleCmd) {
  const { lb } = await lobbyAs(matchId, by);
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

export async function moveSlot(matchId: string, by: number, from: number, to: number) {
  const { l, say, who } = await slotPlayer(matchId, by, from);
  const size = getFormat().teamSize * 2;
  if (to < 0 || to >= size || to === from) return;
  const there = l.lobby.slots[to];
  if (!there) return void (await say(`!mp move ${who} ${to + 1}`));
  await say(`!mp size ${size + 1}`);
  await say(`!mp move ${who} ${size + 1}`);
  await say(`!mp move ${target(there)} ${from + 1}`);
  await say(`!mp move ${who} ${to + 1}`);
  await say(`!mp size ${size}`);
}

const MOD_ARGS: Record<string, string> = { NoMod: "NF", Hidden: "HD NF", HardRock: "HR NF", DoubleTime: "DT NF" };

export async function lobbyPick(matchId: string, stageSlug: string, slot: string) {
  if (!g.bgccIrc?.live.has(matchId)) return;
  const map = (await getPoolStages()).find((s) => s.slug === stageSlug)?.pools.flatMap((p) => p.maps).find((m) => m.slot === slot);
  if (!map) return;
  const l = await liveOf(matchId);
  if (l.lobby.beatmapId !== map.id) await l.lobby.setMap(map.id, 0);
  const mods = MOD_ARGS[map.mod];
  await l.lobby.setMods(mods ?? "", !mods);
  ping(matchId);
}
