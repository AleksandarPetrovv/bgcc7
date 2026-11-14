import "server-only";
import { isScene, type Scene } from "@/lib/scenes";
import { type OverlayFeed, type FeedClock, type FeedStep, type FeedTurn, type LiveScore } from "@/lib/overlay-types";
import { sse } from "@/lib/sse";
import { getPoolStages } from "@/db/mappools";
import { poolFeed, scheduleFeed, streamChat } from "@/lib/overlay-feed";
import type { ChatLine } from "@/lib/lobby-chat";
import { nameKey } from "@/lib/names";
import { IPC_PLAYING } from "@/lib/relay-contract";
import { TB, TIE_HOLD_MS } from "@/lib/draft";
import { DEMO_MATCH } from "@/lib/demo-bracket";
import { getFormat } from "@/db/edition";
import { roundOf } from "@/lib/format";

export const dynamic = "force-dynamic";

const TEAMS = [
  {
    id: "demo-1",
    name: "Shopska Salad",
    image: "https://a.ppy.sh/124493",
    players: [
      { id: 2, name: "peppy", avatar: "https://a.ppy.sh/2", rank: 1240, country: "AU" },
      { id: 124493, name: "Cookiezi", avatar: "https://a.ppy.sh/124493", rank: 312, country: "KR" },
    ],
  },
  {
    id: "demo-2",
    name: "Banitsa Gang",
    image: "https://a.ppy.sh/7562902",
    players: [
      { id: 4504101, name: "WhiteCat", avatar: "https://a.ppy.sh/4504101", rank: 58, country: "DE" },
      { id: 7562902, name: "mrekk", avatar: "https://a.ppy.sh/7562902", rank: 1, country: "AU" },
    ],
  },
];

const POOL = Array.from({ length: 13 }, (_, i) => {
  const slotIndex = i;
  let mod = "NoMod";
  let slot = "";

  if (slotIndex < 5) {
    slot = `NM${slotIndex + 1}`;
    mod = "NoMod";
  } else if (slotIndex < 7) {
    slot = `HD${slotIndex - 4}`;
    mod = "Hidden";
  } else if (slotIndex < 9) {
    slot = `HR${slotIndex - 6}`;
    mod = "HardRock";
  } else if (slotIndex < 12) {
    slot = `DT${slotIndex - 8}`;
    mod = "DoubleTime";
  } else {
    slot = TB;
    mod = "Tiebreaker";
  }

  return {
    slot,
    mod,
    id: 1000001 + i,
    title: `Demo Song ${i + 1}`,
    version: "Extra",
    creator: "demo",
    sr: 5.5 + i * 0.15,
    bpm: 180,
    length: 150,
    cs: 4,
    ar: 9.3,
    od: 9,
    cover: "",
  };
});

// gameplay: pictures only before the map, then the map, then its results
const PRE = 5;
const PLAY = 22;
const AFTER = 5;

const TIMELINE: [Scene, number][] = [
  ["soon", 8],
  ["intro", 18],
  ["mappool", 32],
  ["gameplay", PRE + PLAY + AFTER],
  ["winner", 10],
  ["bracket", 26],
  ["end", 7],
  ["brb", 6],
  ["schedule", 8],
];
const CYCLE = TIMELINE.reduce((n, [, d]) => n + d, 0);

// a demo referee plus the four players, for chat pictures and colours
const REF = { name: "werkzu", avatar: "https://a.ppy.sh/23913323" };
const PEOPLE = new Map<string, { avatar: string; side: 1 | 2 | null }>([
  [nameKey(REF.name), { avatar: REF.avatar, side: null }],
  ...TEAMS.flatMap((t, i) => t.players.map((p) => [nameKey(p.name), { avatar: p.avatar, side: (i + 1) as 1 | 2 }] as const)),
]);

// [seconds into the scene, who, text]. commands, every BanchoBot line and the flagged ones never reach the stream
type Say = [number, string, string];
const CHAT: Partial<Record<Scene, Say[]>> = {
  intro: [
    [0.3, "werkzu", "ok captains !roll aide"],
    [1, "peppy", "!roll"],
    [1.2, "BanchoBot", "peppy rolls 50 point(s)"],
    [2.4, "mrekk", "!roll"],
    [2.6, "BanchoBot", "mrekk rolls 50 point(s)"],
    [3.3, "WhiteCat", "no way"],
    [4, "Cookiezi", "TIE XD"],
    [4.6, "mrekk", "ebasi"],
    [5.3, "werkzu", "tie, roll again"],
    [6.2, "peppy", "bruh"],
    [8.2, "peppy", "!roll"],
    [8.4, "BanchoBot", "peppy rolls 73 point(s)"],
    [9, "Cookiezi", "73 lets gooo"],
    [9.4, "mrekk", "!roll"],
    [9.6, "BanchoBot", "mrekk rolls 41 point(s)"],
    [10.2, "mrekk", "41 bro what"],
    [10.8, "WhiteCat", "xd"],
    [11.4, "werkzu", "red won the roll, pick or ban first?"],
    [12, "mrekk", "rigged roll ngl"],
    [12.6, "Cookiezi", "cope"],
    [13.2, "peppy", "we ban first"],
    [13.4, "werkzu", "!mp settings"],
    [13.5, "BanchoBot", "Room name: BGCC7: (Shopska Salad) vs (Banitsa Gang)"],
    [14.2, "werkzu", "ok red bans first, blue picks first"],
    [14.8, "WhiteCat", "aide brat"],
    [15.3, "mrekk", "kys lol"],
    [15.9, "Cookiezi", "gl hf"],
    [16.4, "mrekk", "glhf"],
    [17, "werkzu", "bans in 2 min"],
    [17.5, "Cookiezi", "kvo shte banvame"],
  ],
  mappool: [
    [0.4, "werkzu", "red, ban"],
    [1, "Cookiezi", "hr2 rn"],
    [1.6, "peppy", "yea"],
    [2.4, "peppy", "hr2"],
    [3.4, "werkzu", "blue, ban"],
    [4, "mrekk", "dt3 they farm dt"],
    [4.6, "WhiteCat", "true"],
    [5.4, "mrekk", "dt3"],
    [6.4, "werkzu", "red, pick"],
    [7, "Cookiezi", "nm1 brat"],
    [7.6, "peppy", "nm1"],
    [8, "werkzu", "!mp map 1000001 0"],
    [8.2, "BanchoBot", "Changed beatmap to https://osu.ppy.sh/b/1000001"],
    [9.4, "WhiteCat", "gg that one"],
    [10, "mrekk", "close tho"],
    [10.8, "werkzu", "blue picks in 30"],
    [11.6, "mrekk", "hmm"],
    [12.6, "WhiteCat", "wait timeout"],
    [13.4, "mrekk", "ye we need a sec"],
    [14.2, "werkzu", "blue timeout, 1 min"],
    [15, "Cookiezi", "xd scared"],
    [16, "peppy", "take ur time"],
    [17.2, "mrekk", "ok whitecat drink water"],
    [18.2, "WhiteCat", "bruh"],
    [19.2, "werkzu", "quick pause, peppy dc"],
    [20, "peppy", "sry internet"],
    [21, "Cookiezi", "ebasi"],
    [22.4, "peppy", "back"],
    [23.2, "werkzu", "blue, pick"],
    [24, "mrekk", "hd1"],
    [25, "WhiteCat", "hd1"],
    [25.6, "werkzu", "!mp map 1000006 8"],
    [25.8, "BanchoBot", "Changed beatmap to https://osu.ppy.sh/b/1000006"],
    [26.6, "Cookiezi", "ebasi aim map"],
    [27.2, "peppy", "ne e fer"],
    [27.8, "werkzu", "red 1 | 1 blue"],
    [28.6, "Cookiezi", "dt1"],
    [29.4, "mrekk", "oh no"],
    [30, "WhiteCat", "we're cooked"],
    [30.6, "werkzu", "ready up"],
    [31.2, "mrekk", "readyyy"],
    [31.7, "peppy", "gl"],
  ],
  gameplay: [
    [0.2, "werkzu", "!mp start 5"],
    [0.4, "BanchoBot", "Queued the match to start in 5 seconds"],
    [1, "mrekk", "gl"],
    [1.5, "Cookiezi", "gl"],
    [2.1, "WhiteCat", "dont choke pls"],
    [2.8, "peppy", "no promises"],
    [3.4, "mrekk", "aide"],
    [4.6, "BanchoBot", "The match has started!"],
    [27.2, "BanchoBot", "The match has finished!"],
    [27.7, "Cookiezi", "LETS GOOO"],
    [28.2, "mrekk", "gg"],
    [28.7, "werkzu", "red 2 | 1 blue"],
    [29.2, "WhiteCat", "ugh 20k"],
    [29.8, "peppy", "dt diff"],
    [30.4, "werkzu", "blue, pick"],
    [31, "mrekk", "4akai"],
    [31.6, "WhiteCat", "this is so retarded"],
  ],
  winner: [
    [0.4, "werkzu", "gg red wins 5-2"],
    [0.9, "Cookiezi", "GGGG"],
    [1.4, "peppy", "ggs"],
    [1.9, "mrekk", "gg wp"],
    [2.5, "WhiteCat", "ggwp next time"],
    [3.1, "Cookiezi", "ez clap"],
    [3.7, "mrekk", "rematch?"],
    [4.3, "peppy", "nope xd"],
    [5, "werkzu", "thanks for playing, results on the site in a sec"],
    [5.7, "WhiteCat", "ty ref"],
    [6.3, "mrekk", "ty"],
    [7, "Cookiezi", "aide chao"],
    [7.8, "peppy", "o7"],
    [8.6, "werkzu", "o7"],
  ],
};

/** the lobby chat so far: this scene's lines up to now plus every earlier scene's, like a real lobby that keeps its history */
function demoChat(scene: Scene, local: number, now: number) {
  const here = TIMELINE.findIndex(([sc]) => sc === scene);
  let start = now - local * 1000;
  const lines: ChatLine[] = [];
  for (let i = here; i >= 0; i--) {
    if (i < here) start -= TIMELINE[i][1] * 1000;
    for (const [t, from, text] of CHAT[TIMELINE[i][0]] ?? []) {
      if (i === here && t > local) continue;
      lines.push({ at: Math.round(start + t * 1000), from, text, ...(from === REF.name ? { ref: true } : {}) });
    }
  }
  return streamChat(lines.sort((a, b) => a.at - b.at), PEOPLE);
}

const STEPS: FeedStep[] = [
  { team: 1, kind: "ban", slot: "HR2", winner: null },
  { team: 2, kind: "ban", slot: "DT3", winner: null },
  { team: 1, kind: "pick", slot: "NM1", winner: 1 },
  { team: 2, kind: "pick", slot: "HD1", winner: 2 },
  { team: 1, kind: "pick", slot: "DT1", winner: null },
];

// rolls: a 50-50 tie that clears after TIE_HOLD_MS, then the real rolls and red's choice
const TIE = { a: 1.2, b: 2.6 };
const ROLLED = { a: 8.4, b: 9.6, choice: 13.6 };

// the mappool scene: [from second, steps done, clock]; seconds in a clock are how long it runs from that second
type PoolBeat = [number, number, { kind: "turn" | "gap"; secs: number } | { kind: "timeout"; team: 1 | 2; secs: number } | { kind: "paused" } | null];
const POOL_BEATS: PoolBeat[] = [
  [0, 0, { kind: "turn", secs: 45 }],
  [3, 1, { kind: "turn", secs: 45 }],
  [6, 2, { kind: "turn", secs: 60 }],
  [9, 3, { kind: "gap", secs: 30 }],
  [14, 3, { kind: "timeout", team: 2, secs: 60 }],
  [19, 3, { kind: "paused" }],
  [23, 3, { kind: "turn", secs: 60 }],
  [26, 4, { kind: "gap", secs: 30 }],
  [29, 5, null],
];

function demo(pin: Scene | null, startedAt: number): OverlayFeed {
  const now = Date.now();
  const elapsed = Math.max(0, now - startedAt) / 1000;
  let scene: Scene = pin ?? "soon";
  let local = 0;
  let cycleStart = startedAt;
  const loop = pin ? (TIMELINE.find(([sc]) => sc === pin)?.[1] ?? 10) : CYCLE;
  if (pin) {
    local = elapsed % loop;
    cycleStart = now - local * 1000;
  } else {
    let t = elapsed % CYCLE;
    cycleStart = now - t * 1000;
    for (const [sc, d] of TIMELINE) {
      if (t < d) {
        scene = sc;
        local = t;
        break;
      }
      t -= d;
    }
  }

  let steps: FeedStep[] = [];
  let current = null;
  let live: LiveScore | null = null;
  let score: [number, number] = [0, 0];
  let winner: 1 | 2 | null = null;
  let rolls: [number | null, number | null] = [73, 41];
  let choice: "pick" | "ban" | null = "pick";
  let turn: FeedTurn = null;

  let clock: FeedClock = null;

  if (scene === "intro") {
    const tied = local < TIE.b + TIE_HOLD_MS / 1000;
    rolls = tied ? [local >= TIE.a ? 50 : null, local >= TIE.b ? 50 : null] : [local >= ROLLED.a ? 73 : null, local >= ROLLED.b ? 41 : null];
    choice = local >= ROLLED.choice ? "ban" : null;
  } else if (scene === "mappool") {
    const [from, done, c] = POOL_BEATS.findLast(([at]) => at <= local)!;
    const sceneStart = now - local * 1000;
    clock = !c ? null : c.kind === "paused" ? c : { ...c, until: Math.round(sceneStart + (from + c.secs) * 1000) };
    steps = STEPS.slice(0, done).map((x) => ({ ...x }));
    const last = steps.at(-1);
    if (last?.kind === "pick" && last.winner === null) current = POOL.find((m) => m.slot === last.slot) ?? null;
    score = [steps.filter((x) => x.winner === 1).length, steps.filter((x) => x.winner === 2).length];
    const next = STEPS[steps.length];
    turn = next ? { kind: next.kind, team: next.team } : null;
  } else if (scene === "gameplay") {
    steps = STEPS;
    score = [1, 1];
    current = POOL.find((m) => m.slot === "DT1") ?? null;
    live = local < PRE ? null : gameplay(local - PRE, now);
  } else if (scene === "winner" || scene === "bracket" || scene === "end") {
    steps = STEPS.map((x) => (x.winner === null && x.kind === "pick" ? { ...x, winner: 1 } : x));
    score = [5, 2];
    winner = 1;
  } else if (scene !== "soon") {
    steps = STEPS;
    score = [1, 1];
  }

  return {
    edition: "bgcc7",
    tournament: "BGCC7",
    match: {
      id: DEMO_MATCH,
      slug: "demo",
      round: getFormat().rounds[roundOf(DEMO_MATCH)]?.name ?? "Quarterfinals",
      startsAt: new Date(cycleStart + 8000 + (pin === "soon" ? 60_000 : 0)).toISOString(),
      firstTo: 5,
      score,
      winner,
      streamer: "demo",
      commentators: null,
    },
    teams: TEAMS as [typeof TEAMS[0], typeof TEAMS[1]],
    pool: POOL,
    steps,
    rolls,
    choice,
    turn,
    clock,
    current,
    live,
    chat: demoChat(scene, local, now),
    scene,
    sceneAuto: !pin,
    demo: { t: Math.round((elapsed % loop) * 1000), len: loop * 1000 },
    at: now,
  };
}

function gameplay(t: number, now: number): LiveScore {
  const run = Math.min(t, PLAY);
  const rate = [12_400, 13_600, 12_900, 13_300];
  const players = [...TEAMS[0].players, ...TEAMS[1].players];
  const clients = players.map((p, i) => {
    const wobble = Math.sin(run * (0.7 + i * 0.2)) * 1800;
    const combo = Math.floor(run * (34 + i * 3));
    return {
      ipcId: i,
      team: (i < 2 ? "left" : "right") as "left" | "right",
      userId: p.id,
      name: p.name,
      score: Math.max(0, Math.floor(run * rate[i] + wobble * Math.min(1, run / 3))),
      accuracy: 97.2 + Math.sin(run * 0.3 + i) * 1.4,
      combo,
      maxCombo: combo,
      mods: ["DT"],
      failed: false,
    };
  });
  return {
    matchId: "DEMO",
    mapId: 1000010,
    ipcState: t >= PLAY ? 4 : IPC_PLAYING,
    clients,
    totals: [clients[0].score + clients[1].score, clients[2].score + clients[3].score],
    at: now,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sceneParam = url.searchParams.get("scene");
  const pin = isScene(sceneParam) ? sceneParam : null;

  // ?t= seconds: the demo bar's seek, the loop starts that far in
  const seek = Number(url.searchParams.get("t"));
  const startedAt = Date.now() - (Number.isFinite(seek) && seek > 0 ? Math.min(seek, CYCLE) * 1000 : 0);
  const stageSlug = url.searchParams.get("stage");
  const stages = await getPoolStages();
  const stage = stageSlug ? stages.find((s) => s.slug === stageSlug) : stages.find((s) => s.released);
  const real = stage ? await poolFeed(stage) : null;
  const schedule = await scheduleFeed();
  return sse(
    req,
    async () => {
      const feed = { ...demo(pin, startedAt), schedule };
      if (!real?.pool.length) return feed;
      const at = (slot: string) => real.pool[Math.min(Math.max(0, POOL.findIndex((m) => m.slot === slot)), real.pool.length - 1)];
      const steps = feed.steps.map((x) => ({ ...x, slot: at(x.slot).slot }));
      const current = feed.current ? at(feed.current.slot) : null;
      const firstTo = stage!.firstTo;
      const score: [number, number] = feed.match.winner ? [firstTo, 2] : feed.match.score;
      return { ...feed, match: { ...feed.match, round: stage!.title, firstTo, score }, pool: real.pool, groups: real.groups, steps, current, live: feed.live && current ? { ...feed.live, mapId: current.id } : feed.live };
    },
    () => () => {},
    100,
  );
}
