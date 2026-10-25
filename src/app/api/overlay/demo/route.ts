import "server-only";
import { isScene, type Scene } from "@/lib/scenes";
import { type OverlayFeed, type FeedStep, type LiveScore } from "@/lib/overlay-types";
import { sse } from "@/lib/sse";
import { getPoolStages } from "@/db/mappools";
import { poolFeed } from "@/lib/overlay-feed";

export const dynamic = "force-dynamic";

const TEAMS = [
  {
    id: "demo-1",
    name: "Shopska Salad",
    image: "",
    players: [
      { id: 2, name: "peppy", avatar: "https://a.ppy.sh/2" },
      { id: 124493, name: "Cookiezi", avatar: "https://a.ppy.sh/124493" },
    ],
  },
  {
    id: "demo-2",
    name: "Banitsa Gang",
    image: "",
    players: [
      { id: 4504101, name: "WhiteCat", avatar: "https://a.ppy.sh/4504101" },
      { id: 7562902, name: "mrekk", avatar: "https://a.ppy.sh/7562902" },
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

function demo(pin: Scene | null, startedAt: number): OverlayFeed {
  const now = Date.now();
  const elapsed = Math.max(0, now - startedAt);
  const t = (elapsed / 1000) % 90;

  let scene: Scene;
  let sceneAuto = true;
  let steps: FeedStep[] = [];
  let current = null;
  let live: LiveScore | null = null;
  let score: [number, number] = [0, 0];
  let matchWinner: 1 | 2 | null = null;

  if (pin !== null && isScene(pin)) {
    scene = pin;
    sceneAuto = false;
    if (scene === "mappool") steps = getMapPoolSteps(20 + t % 20);
    if (scene === "gameplay") {
      steps = getAllSteps();
      current = POOL[9];
      live = getGameplayLive(40 + t % 35, now);
      score = [1, 1];
    }
    if (scene === "winner") {
      steps = getAllSteps();
      score = [5, 2];
      matchWinner = 1;
    }
  } else if (t < 10) {
    scene = "soon";
  } else if (t < 20) {
    scene = "intro";
  } else if (t < 40) {
    scene = "mappool";
    steps = getMapPoolSteps(t);
  } else if (t < 75) {
    scene = "gameplay";
    steps = getAllSteps();
    current = POOL[9];
    live = getGameplayLive(t, now);
    score = [1, 1];
  } else if (t < 85) {
    scene = "winner";
    steps = getAllSteps();
    matchWinner = 1;
    score = [5, 2];
  } else {
    scene = "brb";
  }

  const cycleStart = startedAt + Math.floor(elapsed / 90000) * 90000;
  const startsAt = new Date(cycleStart + 10000).toISOString();

  return {
    edition: "bgcc7",
    tournament: "BGCC7",
    match: {
      id: "DEMO",
      slug: "demo",
      round: "Quarterfinals",
      startsAt,
      firstTo: 5,
      score,
      winner: matchWinner,
      streamer: "demo",
      commentators: null,
    },
    teams: TEAMS as [typeof TEAMS[0], typeof TEAMS[1]],
    pool: POOL,
    steps,
    current,
    live,
    scene,
    sceneAuto,
    at: now,
  };
}

function getMapPoolSteps(t: number): FeedStep[] {
  const stepsData: FeedStep[] = [
    { team: 1, kind: "ban", slot: "HR2", winner: null },
    { team: 2, kind: "ban", slot: "DT3", winner: null },
    { team: 1, kind: "pick", slot: "NM1", winner: null },
    { team: 2, kind: "pick", slot: "HD1", winner: null },
    { team: 1, kind: "pick", slot: "DT1", winner: null },
  ];

  const stepsShown = Math.floor((t - 20) / 4);
  return stepsData.slice(0, Math.min(stepsShown, stepsData.length));
}

function getAllSteps(): FeedStep[] {
  return [
    { team: 1, kind: "ban", slot: "HR2", winner: null },
    { team: 2, kind: "ban", slot: "DT3", winner: null },
    { team: 1, kind: "pick", slot: "NM1", winner: 1 },
    { team: 2, kind: "pick", slot: "HD1", winner: 2 },
    { team: 1, kind: "pick", slot: "DT1", winner: null },
  ];
}

function getGameplayLive(t: number, now: number): LiveScore {
  const baseT = Math.max(0, t - 40);
  const bases = [18000, 21000, 19500, 20500];
  const isFrozen = t >= 70;
  const frozenT = isFrozen ? 30 : baseT;

  const clients = [
    {
      ipcId: 0,
      team: "left" as const,
      userId: 2,
      name: "peppy",
      score: Math.floor(frozenT * bases[0]),
      accuracy: 97 + Math.random() * 2,
      combo: Math.floor(frozenT * 15),
      maxCombo: Math.floor(frozenT * 15),
      mods: ["DT"],
      failed: false,
    },
    {
      ipcId: 1,
      team: "left" as const,
      userId: 124493,
      name: "Cookiezi",
      score: Math.floor(frozenT * bases[1]),
      accuracy: 97 + Math.random() * 2,
      combo: Math.floor(frozenT * 15),
      maxCombo: Math.floor(frozenT * 15),
      mods: ["DT"],
      failed: false,
    },
    {
      ipcId: 2,
      team: "right" as const,
      userId: 4504101,
      name: "WhiteCat",
      score: Math.floor(frozenT * bases[2]),
      accuracy: 97 + Math.random() * 2,
      combo: Math.floor(frozenT * 15),
      maxCombo: Math.floor(frozenT * 15),
      mods: ["DT"],
      failed: false,
    },
    {
      ipcId: 3,
      team: "right" as const,
      userId: 7562902,
      name: "mrekk",
      score: Math.floor(frozenT * bases[3]),
      accuracy: 97 + Math.random() * 2,
      combo: Math.floor(frozenT * 15),
      maxCombo: Math.floor(frozenT * 15),
      mods: ["DT"],
      failed: false,
    },
  ];

  const totals: [number, number] = [
    clients[0].score + clients[1].score,
    clients[2].score + clients[3].score,
  ];

  return {
    matchId: "DEMO",
    mapId: 1000010,
    ipcState: isFrozen ? 4 : 3,
    clients,
    totals,
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
  return sse(
    req,
    async () => {
      const feed = demo(pin, startedAt);
      if (!real?.pool.length) return feed;
      const current = feed.current ? (real.pool.find((m) => m.slot === feed.current!.slot) ?? real.pool[0]) : null;
      return { ...feed, match: { ...feed.match, round: stage!.title, firstTo: stage!.firstTo ?? feed.match.firstTo }, pool: real.pool, groups: real.groups, current, live: feed.live && current ? { ...feed.live, mapId: current.id } : feed.live };
    },
    100,
    () => () => {},
  );
}
