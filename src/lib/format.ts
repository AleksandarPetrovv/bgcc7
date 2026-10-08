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
  rounds: Record<string, { name: string; stage: string; slug: string; single?: boolean }>;
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
const id = (r: string, m: number) => `${r}-M${m}`;
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

const BGCC6: Format = {
  edition: "bgcc6",
  name: "BGCC6",
  year: 2027,
  firstTo: 7,
  teamSize: 3,
  teams: 8,
  feed: {
    "WB-R2-M1": [W("WB-R1-M1"), W("WB-R1-M2")],
    "WB-R2-M2": [W("WB-R1-M3"), W("WB-R1-M4")],
    "WB-R3-M1": [W("WB-R2-M1"), W("WB-R2-M2")],
    "LB-R1-M1": [L("WB-R1-M1"), L("WB-R1-M4")],
    "LB-R1-M2": [L("WB-R1-M2"), L("WB-R1-M3")],
    "LB-R2-M1": [L("WB-R2-M2"), W("LB-R1-M1")],
    "LB-R2-M2": [L("WB-R2-M1"), W("LB-R1-M2")],
    "LB-R3-M1": [W("LB-R2-M1"), W("LB-R2-M2")],
    "LB-R4-M1": [L("WB-R3-M1"), W("LB-R3-M1")],
    "GF-M1": [W("WB-R3-M1"), W("LB-R4-M1")],
    "GF-M2": [W("GF-M1"), L("GF-M1")],
  },
  order: [
    "WB-R1-M1", "WB-R1-M2", "WB-R1-M3", "WB-R1-M4",
    "WB-R2-M1", "WB-R2-M2", "LB-R1-M1", "LB-R1-M2",
    "WB-R3-M1", "LB-R2-M1", "LB-R2-M2", "LB-R3-M1", "LB-R4-M1",
    "GF-M1", "GF-M2",
  ],
  points: { "WB-R1": 10, "LB-R1": 10, "WB-R2": 15, "LB-R2": 15, "WB-R3": 25, "LB-R3": 25, "LB-R4": 35, GF: 50 },
  r1: [[1, 8], [4, 5], [2, 7], [3, 6]],
  rounds: {
    "WB-R1": { name: "Round 1 (Quarter-Finals)", stage: "quarterfinals", slug: "winners-quarterfinals" },
    "WB-R2": { name: "Round 2 (Semi-Finals)", stage: "semifinals", slug: "winners-semifinals" },
    "WB-R3": { name: "Winners Finals", stage: "finals", slug: "winners-finals", single: true },
    "LB-R1": { name: "Losers Round 1", stage: "quarterfinals", slug: "losers-round-1" },
    "LB-R2": { name: "Losers Round 2", stage: "semifinals", slug: "losers-round-2" },
    "LB-R3": { name: "Losers Round 3", stage: "finals", slug: "losers-round-3", single: true },
    "LB-R4": { name: "Losers Finals", stage: "finals", slug: "losers-finals", single: true },
    GF: { name: "Grand Finals", stage: "grand-finals", slug: "grandfinals" },
  },
  losersFinal: "LB-R4-M1",
  winnersFinal: "WB-R3-M1",
  sectionsOff: [],
  layout: {
    gfCol: 5,
    gfRow: 1.5,
    upRows: 4,
    lowRows: 2,
    mark: 3,
    box: { g: 28, h: 92, gap: 18, minW: 210 },
    pick: { w: 214, g: 40, h: 78, pitch: 100 },
    pos: {
      "WB-R1-M1": [0, 0, "u"], "WB-R1-M2": [0, 1, "u"], "WB-R1-M3": [0, 2, "u"], "WB-R1-M4": [0, 3, "u"],
      "WB-R2-M1": [1, 0.5, "u"], "WB-R2-M2": [1, 2.5, "u"],
      "WB-R3-M1": [2, 1.5, "u"],
      "LB-R1-M1": [1, 0, "l"], "LB-R1-M2": [1, 1, "l"],
      "LB-R2-M1": [2, 0, "l"], "LB-R2-M2": [2, 1, "l"],
      "LB-R3-M1": [3, 0.5, "l"],
      "LB-R4-M1": [4, 0.5, "l"],
    },
    drops: [
      ["WB-R1-M1", "LB-R1-M1"], ["WB-R1-M4", "LB-R1-M1"], ["WB-R1-M2", "LB-R1-M2"], ["WB-R1-M3", "LB-R1-M2"],
      ["WB-R2-M2", "LB-R2-M1"], ["WB-R2-M1", "LB-R2-M2"], ["WB-R3-M1", "LB-R4-M1"],
    ],
    headers: [
      { c: 0, s: "u", t: "Round 1 (Quarter-Finals)" },
      { c: 1, s: "u", t: "Round 2 (Semi-Finals)" },
      { c: 2, s: "u", t: "Winners Finals" },
      { c: 1, s: "l", t: "Losers Round 1" },
      { c: 2, s: "l", t: "Losers Round 2" },
      { c: 3, s: "l", t: "Losers Round 3" },
      { c: 4, s: "l", t: "Losers Finals" },
    ],
  },
};

function bgcc7(): Format {
  const feed: Record<string, [Src, Src]> = {};
  for (const k of range(4)) feed[id("WB-R2", k)] = [W(id("WB-R1", 2 * k - 1)), W(id("WB-R1", 2 * k))];
  for (const k of range(2)) feed[id("WB-R3", k)] = [W(id("WB-R2", 2 * k - 1)), W(id("WB-R2", 2 * k))];
  feed["WB-R4-M1"] = [W("WB-R3-M1"), W("WB-R3-M2")];
  for (const k of range(4)) feed[id("LB-R1", k)] = [L(id("WB-R1", 2 * k - 1)), L(id("WB-R1", 2 * k))];
  for (const k of range(4)) feed[id("LB-R2", k)] = [L(id("WB-R2", 5 - k)), W(id("LB-R1", k))];
  for (const k of range(2)) feed[id("LB-R3", k)] = [W(id("LB-R2", 2 * k - 1)), W(id("LB-R2", 2 * k))];
  for (const k of range(2)) feed[id("LB-R4", k)] = [L(id("WB-R3", k)), W(id("LB-R3", k))];
  feed["LB-R5-M1"] = [W("LB-R4-M1"), W("LB-R4-M2")];
  feed["LB-R6-M1"] = [L("WB-R4-M1"), W("LB-R5-M1")];
  feed["GF-M1"] = [W("WB-R4-M1"), W("LB-R6-M1")];
  feed["GF-M2"] = [W("GF-M1"), L("GF-M1")];

  const round = (r: string, n: number) => range(n).map((k) => id(r, k));
  const order = [
    ...round("WB-R1", 8),
    ...round("LB-R1", 4),
    ...round("WB-R2", 4),
    ...round("LB-R2", 4),
    ...round("WB-R3", 2),
    ...round("LB-R3", 2),
    ...round("LB-R4", 2),
    "WB-R4-M1",
    "LB-R5-M1",
    "LB-R6-M1",
    "GF-M1",
    "GF-M2",
  ];

  const pos: Format["layout"]["pos"] = {};
  for (const k of range(8)) pos[id("WB-R1", k)] = [0, k - 1, "u"];
  for (const k of range(4)) pos[id("WB-R2", k)] = [1, 2 * k - 1.5, "u"];
  for (const k of range(2)) pos[id("WB-R3", k)] = [2, 4 * k - 2.5, "u"];
  pos["WB-R4-M1"] = [3, 3.5, "u"];
  for (const k of range(4)) pos[id("LB-R1", k)] = [1, k - 1, "l"];
  for (const k of range(4)) pos[id("LB-R2", k)] = [2, k - 1, "l"];
  for (const k of range(2)) pos[id("LB-R3", k)] = [3, 2 * k - 1.5, "l"];
  for (const k of range(2)) pos[id("LB-R4", k)] = [4, 2 * k - 1.5, "l"];
  pos["LB-R5-M1"] = [5, 1.5, "l"];
  pos["LB-R6-M1"] = [6, 1.5, "l"];

  const drops: [string, string][] = [];
  for (const [to, srcs] of Object.entries(feed)) if (to.startsWith("LB")) for (const s of srcs) if (s.take === "L") drops.push([s.from, to]);

  return {
    edition: "bgcc7",
    name: "BGCC7",
    year: 2027,
    firstTo: 7,
    teamSize: 2,
    teams: 16,
    feed,
    order,
    points: { "WB-R1": 5, "LB-R1": 5, "WB-R2": 10, "LB-R2": 10, "WB-R3": 15, "LB-R3": 15, "LB-R4": 15, "WB-R4": 25, "LB-R5": 25, "LB-R6": 25, GF: 50 },
    r1: [[1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15]],
    rounds: {
      "WB-R1": { name: "Round of 16", stage: "round-of-16", slug: "winners-round-of-16" },
      "WB-R2": { name: "Quarterfinals", stage: "quarterfinals", slug: "winners-quarterfinals" },
      "WB-R3": { name: "Semifinals", stage: "semifinals", slug: "winners-semifinals" },
      "WB-R4": { name: "Winners Finals", stage: "finals", slug: "winners-finals", single: true },
      "LB-R1": { name: "Losers Round 1", stage: "round-of-16", slug: "losers-round-1" },
      "LB-R2": { name: "Losers Round 2", stage: "quarterfinals", slug: "losers-round-2" },
      "LB-R3": { name: "Losers Round 3", stage: "semifinals", slug: "losers-round-3" },
      "LB-R4": { name: "Losers Round 4", stage: "semifinals", slug: "losers-round-4" },
      "LB-R5": { name: "Losers Round 5", stage: "finals", slug: "losers-round-5", single: true },
      "LB-R6": { name: "Losers Finals", stage: "finals", slug: "losers-finals", single: true },
      GF: { name: "Grand Finals", stage: "grand-finals", slug: "grandfinals" },
    },
    losersFinal: "LB-R6-M1",
    winnersFinal: "WB-R4-M1",
    sectionsOff: ["lobbies", "qualScores", "seeding"],
    layout: {
      gfCol: 7,
      gfRow: 3.5,
      upRows: 8,
      lowRows: 4,
      mark: 4,
      box: { g: 20, h: 80, gap: 14, minW: 176 },
      pick: { w: 162, g: 22, h: 66, pitch: 82 },
      pos,
      drops,
      headers: [
        { c: 0, s: "u", t: "Round of 16" },
        { c: 1, s: "u", t: "Quarterfinals" },
        { c: 2, s: "u", t: "Semifinals" },
        { c: 3, s: "u", t: "Winners Finals" },
        { c: 1, s: "l", t: "Losers Round 1" },
        { c: 2, s: "l", t: "Losers Round 2" },
        { c: 3, s: "l", t: "Losers Round 3" },
        { c: 4, s: "l", t: "Losers Round 4" },
        { c: 5, s: "l", t: "Losers Round 5" },
        { c: 6, s: "l", t: "Losers Finals" },
      ],
    },
  };
}

export const FORMATS: Record<Edition, Format> = { bgcc6: BGCC6, bgcc7: bgcc7() };

export const roundOf = (matchId: string) => (matchId.startsWith("GF") ? "GF" : matchId.replace(/-M\d+$/, ""));

export const winTargets = (f: Format) => {
  const out: Record<string, string> = {};
  for (const [to, srcs] of Object.entries(f.feed)) {
    if (to === "GF-M2") continue;
    for (const s of srcs) if (s.take === "W" && !out[s.from]) out[s.from] = to;
  }
  return out;
};

export const TEST_MATCH = { id: "TEST-M1", slug: "test-1" } as const;
export const isTestTeam = (id: string | null | undefined) => !!id?.startsWith("test-");

export const lobbySize =(f: Format) => f.teamSize * 2;
export const versus = (f: Format) => `${f.teamSize}v${f.teamSize}`;
export const playerCount = (f: Format) => f.teams * f.teamSize;

export function matchSlug(f: Format, id: string) {
  if (id === TEST_MATCH.id) return TEST_MATCH.slug;
  const m = id.match(/^(GF|[WL]B-R\d)-M(\d+)$/);
  const r = m && f.rounds[m[1]];
  return m && r ? `${r.slug}-${m[2]}` : id.toLowerCase();
}

export function matchIdFromSlug(f: Format, slug: string) {
  if (slug === TEST_MATCH.slug) return TEST_MATCH.id;
  const m = slug.match(/^([a-z0-9-]+)-([1-9]\d*)$/);
  if (!m) return "";
  const round = Object.entries(f.rounds).find(([, r]) => r.slug === m[1])?.[0];
  const id = round ? `${round}-M${Number(m[2])}` : "";
  return f.order.includes(id) ? id : "";
}

export const bracketRows = (f: Format) =>
  f.order.map((mid, i) => {
    const r = f.rounds[roundOf(mid)];
    return { id: mid, stageSlug: r.stage, bracket: mid.startsWith("WB") ? "winners" : mid.startsWith("LB") ? "losers" : "grand", round: r.name, order: i + 1 };
  });
