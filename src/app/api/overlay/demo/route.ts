import "server-only";
import { isScene, type Scene } from "@/lib/scenes";
import { type OverlayFeed, type FeedStep, type LiveScore } from "@/lib/overlay-types";
import { sse } from "@/lib/sse";
import { getPoolStages } from "@/db/mappools";
import { poolFeed, scheduleFeed } from "@/lib/overlay-feed";

export const dynamic = "force-dynamic";

const TEAMS = [
  {
    id: "demo-1",
    name: "Shopska Salad",
    image: "",
    players: [
      { id: 2, name: "peppy", avatar: "https://a.ppy.sh/2", rank: 1240, country: "AU" },
      { id: 124493, name: "Cookiezi", avatar: "https://a.ppy.sh/124493", rank: 312, country: "KR" },
    ],
  },
  {
    id: "demo-2",
    name: "Banitsa Gang",
    image: "",
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
    slot = "TB";
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

// one loop through every scene; ?scene= pins one and loops just that part
const TIMELINE: [Scene, number][] = [
  ["soon", 8],
  ["intro", 15],
  ["mappool", 22],
  ["gameplay", 26],
  ["winner", 10],
  ["brb", 6],
  ["schedule", 8],
  ["bracket", 8],
  ["end", 7],
];
const CYCLE = TIMELINE.reduce((n, [, d]) => n + d, 0);

const STEPS: FeedStep[] = [
  { team: 1, kind: "ban", slot: "HR2", winner: null },
  { team: 2, kind: "ban", slot: "DT3", winner: null },
  { team: 1, kind: "pick", slot: "NM1", winner: 1 },
  { team: 2, kind: "pick", slot: "HD1", winner: 2 },
  { team: 1, kind: "pick", slot: "DT1", winner: null },
];

function demo(pin: Scene | null, startedAt: number): OverlayFeed {
  const now = Date.now();
  const elapsed = Math.max(0, now - startedAt) / 1000;
  let scene: Scene = pin ?? "soon";
  let local = 0;
  let cycleStart = startedAt;
  if (pin) {
    const len = TIMELINE.find(([sc]) => sc === pin)?.[1] ?? 10;
    local = elapsed % len;
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

  if (scene === "intro") {
    rolls = [local >= 2 ? 73 : null, local >= 4.5 ? 41 : null];
    choice = null;
  } else if (scene === "mappool") {
    // a step every 3s, the last pick lights up as the map in play
    steps = STEPS.slice(0, Math.min(STEPS.length, Math.floor(local / 3))).map((x) => ({ ...x }));
    const last = steps.at(-1);
    if (last?.kind === "pick" && last.winner === null) current = POOL.find((m) => m.slot === last.slot) ?? null;
    score = [steps.filter((x) => x.winner === 1).length, steps.filter((x) => x.winner === 2).length];
  } else if (scene === "gameplay") {
    steps = STEPS;
    score = [1, 1];
    current = POOL.find((m) => m.slot === "DT1") ?? null;
    live = gameplay(local, now);
  } else if (scene === "winner" || scene === "end") {
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
      id: "DEMO",
      slug: "demo",
      round: "Quarterfinals",
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
    current,
    live,
    scene,
    sceneAuto: !pin,
    at: now,
  };
}

// scores climb to roughly 300k a player over ~22s, then the map ends and holds
function gameplay(t: number, now: number): LiveScore {
  const run = Math.min(t, 22);
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
    ipcState: t >= 22 ? 4 : 3,
    clients,
    totals: [clients[0].score + clients[1].score, clients[2].score + clients[3].score],
    at: now,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sceneParam = url.searchParams.get("scene");
  const pin = isScene(sceneParam) ? sceneParam : null;

  const startedAt = Date.now();
  const stageSlug = url.searchParams.get("stage");
  const stage = stageSlug ? (await getPoolStages()).find((s) => s.slug === stageSlug) : undefined;
  const real = stage ? await poolFeed(stage) : null;
  const schedule = await scheduleFeed();
  return sse(
    req,
    async () => {
      const feed = { ...demo(pin, startedAt), schedule };
      if (!real?.pool.length) return feed;
      const current = feed.current ? (real.pool.find((m) => m.slot === feed.current!.slot) ?? real.pool[0]) : null;
      return { ...feed, match: { ...feed.match, round: stage!.title, firstTo: stage!.firstTo ?? feed.match.firstTo }, pool: real.pool, groups: real.groups, current, live: feed.live && current ? { ...feed.live, mapId: current.id } : feed.live };
    },
    100,
    () => () => {},
  );
}
