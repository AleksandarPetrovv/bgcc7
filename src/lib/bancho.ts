import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { BanchoLobbyPlayerStates, BanchoLobbyTeamModes, BanchoLobbyWinConditions } from "bancho.js";
import { db } from "@/db";
import { matches, mpLobbies, staff, users } from "@/db/schema";
import { getFormat } from "@/db/edition";
import { draftMaps, draftSlots, getDraft, setResult } from "@/db/drafts";
import { other, rollWinner, scoreOf, turnOf, type DraftView } from "@/lib/draft";
import { getUser } from "@/lib/osu-api";
import { lobbySize } from "@/lib/format";

import { CHAT_GAP, attach, canLobby, conn, ensureBot, g, lastSent, lobbyOwner, markClosed, membersOf, online, ownerOf, ping, playStart, state, syncOf, typed, type Live, type LobbySlot, type LobbyView } from "./bancho-irc";

export { CHAT_GAP, canLobby, ensureBot, lobbyOwner, onLobby, sayLocal, type ChatLine, type LobbySlot, type LobbyView } from "./bancho-irc";

export type ScoreLine = { score: number; pass: boolean; team?: string; userId?: number };

export async function onFinished(matchId: string, scores: ScoreLine[]) {
  const l = g.bgccIrc?.live.get(matchId);
  if (!l) return null;
  const d = await getDraft(matchId);
  if (!d) return null;
  const picks = d.steps.filter((s) => s.kind === "pick" && !s.skip);
  const maps = await draftMaps(matchId, d.stageSlug);
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

export function react(matchId: string) {
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
  const slots = await draftSlots(l.matchId, n.stageSlug);

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
  const mine = viewer != null && (owner == null || owner === viewer);
  const base: LobbyView = { bot: status, state: row ? (row.open ? "open" : "closed") : "none", mpId: row?.mpId ?? null, password: row?.password ?? "", size: 0, slots: [], mapId: null, mapName: null, mods: [], freemod: false, playing: false, chat: [], owner, ...(viewer != null ? { mine, helper: canLobby(viewer) } : {}) };
  const l = g.bgccIrc?.live.get(matchId);
  if (!l || !row?.open) return base;
  const lb = l.lobby;
  const size = Math.max(lobbySize(getFormat()) + 1, ...lb.slots.map((p, i) => (p ? i + 1 : 0)));
  const refs = await lobbyRefNames();
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

export async function lobbyRefNames() {
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
  const maps = stage ? await draftMaps(matchId, stage) : [];
  const byId = /^\d+$/.test(m[1]);
  const map = maps.find((x) => (byId ? x.id === Number(m[1]) : x.slot.toLowerCase() === m[1].toLowerCase()));
  if (!map) return byId ? { text, mod: undefined } : ("noslot" as const);
  return { text: `!mp map ${map.id}${m[2]}`, mod: map.mod };
}

const modArgs = (mod: string) => (MOD_ARGS[mod] ? [MOD_ARGS[mod], false] : ["NF", true]) as [string, boolean];


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
  const map = (await draftMaps(matchId, stageSlug)).find((m) => m.slot === slot);
  if (!map) return;
  const l = await liveOf(matchId);
  if (l.lobby.beatmapId !== map.id) await l.lobby.setMap(map.id, 0);
  await l.lobby.setMods(...modArgs(map.mod));
  ping(matchId);
}
