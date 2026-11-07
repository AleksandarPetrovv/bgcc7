export const EDITIONS = ["bgcc6", "bgcc7"] as const;
export type Edition = (typeof EDITIONS)[number];
export const isEdition = (v: unknown): v is Edition => typeof v === "string" && (EDITIONS as readonly string[]).includes(v);

export type Src = { from: string; take: "W" | "L" };
export type Half = "u" | "l";

export type Format = {
  edition: Edition;
  name: string;
  year: number;
  firstTo: number;
  teamSize: number;
  teams: number;
  feed: Record<string, [Src, Src]>;
  order: string[];
  points: Record<string, number>;
  r1: [number, number][];
  /** keyed by round slug; a match id is `<round>-<n>`, or just `<round>` when the round is a single match */
  rounds: Record<string, { name: string; stage: string; single?: boolean }>;
  losersFinal: string;
  winnersFinal: string;
  sectionsOff: string[];
  layout: {
    gfCol: number;
    gfRow: number;
    upRows: number;
    lowRows: number;
    mark: number;
    box: { g: number; h: number; gap: number; minW: number };
    pick: { w: number; g: number; h: number; pitch: number };
    pos: Record<string, [number, number, Half]>;
    drops: [string, string][];
    headers: { c: number; s: Half; t: string }[];
  };
};

const W = (from: string): Src => ({ from, take: "W" });
const L = (from: string): Src => ({ from, take: "L" });
const id = (r: string, m: number) => `${r}-${m}`;
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

const formatBGCC6: Format = {
  edition: "bgcc6",
  name: "BGCC6",
  year: 2027,
  firstTo: 7,
  teamSize: 3,
  teams: 8,
  feed: {
    "winners-semifinals-1": [W("winners-quarterfinals-1"), W("winners-quarterfinals-2")],
    "winners-semifinals-2": [W("winners-quarterfinals-3"), W("winners-quarterfinals-4")],
    "winners-final": [W("winners-semifinals-1"), W("winners-semifinals-2")],
    "losers-round-1-1": [L("winners-quarterfinals-1"), L("winners-quarterfinals-4")],
    "losers-round-1-2": [L("winners-quarterfinals-2"), L("winners-quarterfinals-3")],
    "losers-round-2-1": [L("winners-semifinals-2"), W("losers-round-1-1")],
    "losers-round-2-2": [L("winners-semifinals-1"), W("losers-round-1-2")],
    "losers-round-3": [W("losers-round-2-1"), W("losers-round-2-2")],
    "losers-final": [L("winners-final"), W("losers-round-3")],
    "grand-final": [W("winners-final"), W("losers-final")],
    "grand-final-reset": [W("grand-final"), L("grand-final")],
  },
  order: [
    "winners-quarterfinals-1", "winners-quarterfinals-2", "winners-quarterfinals-3", "winners-quarterfinals-4",
    "winners-semifinals-1", "winners-semifinals-2", "losers-round-1-1", "losers-round-1-2",
    "winners-final", "losers-round-2-1", "losers-round-2-2", "losers-round-3", "losers-final",
    "grand-final", "grand-final-reset",
  ],
  points: { "winners-quarterfinals": 10, "losers-round-1": 10, "winners-semifinals": 15, "losers-round-2": 15, "winners-final": 25, "losers-round-3": 25, "losers-final": 35, "grand-final": 50, "grand-final-reset": 50 },
  r1: [[1, 8], [4, 5], [2, 7], [3, 6]],
  rounds: {
    "winners-quarterfinals": { name: "Round 1 (Quarter-Finals)", stage: "quarterfinals" },
    "winners-semifinals": { name: "Round 2 (Semi-Finals)", stage: "semifinals" },
    "winners-final": { name: "Winners Finals", stage: "finals", single: true },
    "losers-round-1": { name: "Losers Round 1", stage: "quarterfinals" },
    "losers-round-2": { name: "Losers Round 2", stage: "semifinals" },
    "losers-round-3": { name: "Losers Round 3", stage: "finals", single: true },
    "losers-final": { name: "Losers Finals", stage: "finals", single: true },
    "grand-final": { name: "Grand Finals", stage: "grand-finals", single: true },
    "grand-final-reset": { name: "Grand Finals", stage: "grand-finals", single: true },
  },
  losersFinal: "losers-final",
  winnersFinal: "winners-final",
  sectionsOff: [],
  layout: {
    gfCol: 4,
    gfRow: 1.5,
    upRows: 4,
    lowRows: 2,
    mark: 2,
    box: { g: 28, h: 92, gap: 18, minW: 210 },
    pick: { w: 214, g: 40, h: 78, pitch: 100 },
    pos: {
      "winners-quarterfinals-1": [0, 0, "u"], "winners-quarterfinals-2": [0, 1, "u"], "winners-quarterfinals-3": [0, 2, "u"], "winners-quarterfinals-4": [0, 3, "u"],
      "winners-semifinals-1": [1, 0.5, "u"], "winners-semifinals-2": [1, 2.5, "u"],
      "winners-final": [2, 1.5, "u"],
      "losers-round-1-1": [0, 0, "l"], "losers-round-1-2": [0, 1, "l"],
      "losers-round-2-1": [1, 0, "l"], "losers-round-2-2": [1, 1, "l"],
      "losers-round-3": [2, 0.5, "l"],
      "losers-final": [3, 0.5, "l"],
    },
    drops: [
      ["winners-quarterfinals-1", "losers-round-1-1"], ["winners-quarterfinals-4", "losers-round-1-1"], ["winners-quarterfinals-2", "losers-round-1-2"], ["winners-quarterfinals-3", "losers-round-1-2"],
      ["winners-semifinals-2", "losers-round-2-1"], ["winners-semifinals-1", "losers-round-2-2"], ["winners-final", "losers-final"],
    ],
    headers: [
      { c: 0, s: "u", t: "Round 1 (Quarter-Finals)" },
      { c: 1, s: "u", t: "Round 2 (Semi-Finals)" },
      { c: 2, s: "u", t: "Winners Finals" },
      { c: 0, s: "l", t: "Losers Round 1" },
      { c: 1, s: "l", t: "Losers Round 2" },
      { c: 2, s: "l", t: "Losers Round 3" },
      { c: 3, s: "l", t: "Losers Finals" },
    ],
  },
};

function buildFormat(): Format {
  const feed: Record<string, [Src, Src]> = {};
  for (const k of range(4)) feed[id("winners-quarterfinals", k)] = [W(id("winners-round-of-16", 2 * k - 1)), W(id("winners-round-of-16", 2 * k))];
  for (const k of range(2)) feed[id("winners-semifinals", k)] = [W(id("winners-quarterfinals", 2 * k - 1)), W(id("winners-quarterfinals", 2 * k))];
  feed["winners-final"] = [W("winners-semifinals-1"), W("winners-semifinals-2")];
  for (const k of range(4)) feed[id("losers-round-1", k)] = [L(id("winners-round-of-16", 2 * k - 1)), L(id("winners-round-of-16", 2 * k))];
  for (const k of range(4)) feed[id("losers-round-2", k)] = [L(id("winners-quarterfinals", 5 - k)), W(id("losers-round-1", k))];
  for (const k of range(2)) feed[id("losers-round-3", k)] = [W(id("losers-round-2", 2 * k - 1)), W(id("losers-round-2", 2 * k))];
  for (const k of range(2)) feed[id("losers-round-4", k)] = [L(id("winners-semifinals", k)), W(id("losers-round-3", k))];
  feed["losers-round-5"] = [W("losers-round-4-1"), W("losers-round-4-2")];
  feed["losers-final"] = [L("winners-final"), W("losers-round-5")];
  feed["grand-final"] = [W("winners-final"), W("losers-final")];
  feed["grand-final-reset"] = [W("grand-final"), L("grand-final")];

  const round = (r: string, n: number) => range(n).map((k) => id(r, k));
  const order = [
    ...round("winners-round-of-16", 8),
    ...round("losers-round-1", 4),
    ...round("winners-quarterfinals", 4),
    ...round("losers-round-2", 4),
    ...round("winners-semifinals", 2),
    ...round("losers-round-3", 2),
    ...round("losers-round-4", 2),
    "winners-final",
    "losers-round-5",
    "losers-final",
    "grand-final",
    "grand-final-reset",
  ];

  const pos: Format["layout"]["pos"] = {};
  for (const k of range(8)) pos[id("winners-round-of-16", k)] = [0, k - 1, "u"];
  for (const k of range(4)) pos[id("winners-quarterfinals", k)] = [1, 2 * k - 1.5, "u"];
  for (const k of range(2)) pos[id("winners-semifinals", k)] = [2, 4 * k - 2.5, "u"];
  pos["winners-final"] = [3, 3.5, "u"];
  for (const k of range(4)) pos[id("losers-round-1", k)] = [0, k - 1, "l"];
  for (const k of range(4)) pos[id("losers-round-2", k)] = [1, k - 1, "l"];
  for (const k of range(2)) pos[id("losers-round-3", k)] = [2, 2 * k - 1.5, "l"];
  for (const k of range(2)) pos[id("losers-round-4", k)] = [3, 2 * k - 1.5, "l"];
  pos["losers-round-5"] = [4, 1.5, "l"];
  pos["losers-final"] = [5, 1.5, "l"];

  const drops: [string, string][] = [];
  for (const [to, srcs] of Object.entries(feed)) if (to.startsWith("losers-")) for (const s of srcs) if (s.take === "L") drops.push([s.from, to]);

  return {
    edition: "bgcc7",
    name: "BGCC7",
    year: 2027,
    firstTo: 7,
    teamSize: 2,
    teams: 16,
    feed,
    order,
    points: { "winners-round-of-16": 5, "losers-round-1": 5, "winners-quarterfinals": 10, "losers-round-2": 10, "winners-semifinals": 15, "losers-round-3": 15, "losers-round-4": 15, "winners-final": 25, "losers-round-5": 25, "losers-final": 25, "grand-final": 50, "grand-final-reset": 50 },
    r1: [[1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15]],
    rounds: {
      "winners-round-of-16": { name: "Round of 16", stage: "round-of-16" },
      "winners-quarterfinals": { name: "Quarterfinals", stage: "quarterfinals" },
      "winners-semifinals": { name: "Semifinals", stage: "semifinals" },
      "winners-final": { name: "Winners Finals", stage: "finals", single: true },
      "losers-round-1": { name: "Losers Round 1", stage: "round-of-16" },
      "losers-round-2": { name: "Losers Round 2", stage: "quarterfinals" },
      "losers-round-3": { name: "Losers Round 3", stage: "semifinals" },
      "losers-round-4": { name: "Losers Round 4", stage: "semifinals" },
      "losers-round-5": { name: "Losers Round 5", stage: "finals", single: true },
      "losers-final": { name: "Losers Finals", stage: "finals", single: true },
      "grand-final": { name: "Grand Finals", stage: "grand-finals", single: true },
      "grand-final-reset": { name: "Grand Finals", stage: "grand-finals", single: true },
    },
    losersFinal: "losers-final",
    winnersFinal: "winners-final",
    sectionsOff: ["lobbies", "qualScores", "seeding"],
    layout: {
      gfCol: 6,
      gfRow: 3.5,
      upRows: 8,
      lowRows: 4,
      mark: 3,
      box: { g: 16, h: 80, gap: 14, minW: 176 },
      pick: { w: 162, g: 22, h: 66, pitch: 82 },
      pos,
      drops,
      headers: [
        { c: 0, s: "u", t: "Round of 16" },
        { c: 1, s: "u", t: "Quarterfinals" },
        { c: 2, s: "u", t: "Semifinals" },
        { c: 3, s: "u", t: "Winners Finals" },
        { c: 0, s: "l", t: "Losers Round 1" },
        { c: 1, s: "l", t: "Losers Round 2" },
        { c: 2, s: "l", t: "Losers Round 3" },
        { c: 3, s: "l", t: "Losers Round 4" },
        { c: 4, s: "l", t: "Losers Round 5" },
        { c: 5, s: "l", t: "Losers Finals" },
      ],
    },
  };
}

export const FORMAT = buildFormat();
export const FORMATS: Record<Edition, Format> = { bgcc6: formatBGCC6, bgcc7: FORMAT };

export const GF = "grand-final";
export const GF_RESET = "grand-final-reset";

const ROUNDS = new Set(Object.values(FORMATS).flatMap((f) => Object.keys(f.rounds)));
export const roundOf = (matchId: string) => (ROUNDS.has(matchId) ? matchId : matchId.replace(/-\d+$/, ""));
/** the match's number inside its round ("3" for winners-r1-3), null when the round is a single match */
export const matchNum = (f: Format, matchId: string) => (f.rounds[roundOf(matchId)]?.single ? null : (matchId.match(/-(\d+)$/)?.[1] ?? null));

export const winTargets = (f: Format) => {
  const out: Record<string, string> = {};
  for (const [to, srcs] of Object.entries(f.feed)) {
    if (to === GF_RESET) continue;
    for (const s of srcs) if (s.take === "W" && !out[s.from]) out[s.from] = to;
  }
  return out;
};

export const TEST_MATCH = { id: "test-1", slug: "test-1" } as const;
export const isTestTeam = (id: string | null | undefined) => !!id?.startsWith("test-");

export const lobbySize =(f: Format) => f.teamSize * 2;
export const versus = (f: Format) => `${f.teamSize}v${f.teamSize}`;
export const playerCount = (f: Format) => f.teams * f.teamSize;

// match ids are their url slugs
export const matchIdFromSlug = (f: Format, slug: string) => (slug === TEST_MATCH.id || f.order.includes(slug) ? slug : "");
