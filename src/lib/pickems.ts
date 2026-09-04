import { z } from "zod";
import type { Match } from "@/lib/data";

type Src = { from: string; take: "W" | "L" };

export const FEED: Record<string, [Src, Src]> = {
  "WB-R2-M1": [{ from: "WB-R1-M1", take: "W" }, { from: "WB-R1-M2", take: "W" }],
  "WB-R2-M2": [{ from: "WB-R1-M3", take: "W" }, { from: "WB-R1-M4", take: "W" }],
  "WB-R3-M1": [{ from: "WB-R2-M1", take: "W" }, { from: "WB-R2-M2", take: "W" }],
  "LB-R1-M1": [{ from: "WB-R1-M1", take: "L" }, { from: "WB-R1-M4", take: "L" }],
  "LB-R1-M2": [{ from: "WB-R1-M2", take: "L" }, { from: "WB-R1-M3", take: "L" }],
  "LB-R2-M1": [{ from: "WB-R2-M2", take: "L" }, { from: "LB-R1-M1", take: "W" }],
  "LB-R2-M2": [{ from: "WB-R2-M1", take: "L" }, { from: "LB-R1-M2", take: "W" }],
  "LB-R3-M1": [{ from: "LB-R2-M1", take: "W" }, { from: "LB-R2-M2", take: "W" }],
  "LB-R4-M1": [{ from: "WB-R3-M1", take: "L" }, { from: "LB-R3-M1", take: "W" }],
  "GF-M1": [{ from: "WB-R3-M1", take: "W" }, { from: "LB-R4-M1", take: "W" }],
  "GF-M2": [{ from: "GF-M1", take: "W" }, { from: "GF-M1", take: "L" }],
};

export const ORDER = [
  "WB-R1-M1", "WB-R1-M2", "WB-R1-M3", "WB-R1-M4",
  "WB-R2-M1", "WB-R2-M2", "LB-R1-M1", "LB-R1-M2",
  "WB-R3-M1", "LB-R2-M1", "LB-R2-M2", "LB-R3-M1", "LB-R4-M1",
  "GF-M1", "GF-M2",
] as const;

export const POINTS: Record<string, number> = {
  "WB-R1": 10, "LB-R1": 10,
  "WB-R2": 15, "LB-R2": 15,
  "WB-R3": 25, "LB-R3": 25,
  "LB-R4": 35,
  GF: 50,
};
const pointsFor = (id: string) => POINTS[id.startsWith("GF") ? "GF" : id.slice(0, 5)] ?? 0;

export type Seeding = Record<string, readonly [string, string]>;
export const seedingOf = (matches: Match[]): Seeding =>
  Object.fromEntries(matches.filter((m) => m.id.startsWith("WB-R1")).map((m) => [m.id, [m.team1.id, m.team2.id] as const]));
export const actualOf = (matches: Match[]): Picks =>
  Object.fromEntries(matches.filter((m) => m.winner).map((m) => [m.id, m.winner === 1 ? m.team1.id : m.team2.id]));

export type Picks = Record<string, string>;

export const picksSchema = z.record(z.enum(ORDER), z.string().min(1).max(64));

export function resolve(picks: Picks, seeded: Seeding) {
  const slots: Record<string, [string | null, string | null]> = {};
  const clean: Picks = {};
  const result = (id: string, take: "W" | "L") => {
    const w = clean[id];
    if (!w) return null;
    const [a, b] = slots[id];
    return take === "W" ? w : w === a ? b : a;
  };
  for (const id of ORDER) {
    slots[id] = seeded[id] ? [seeded[id][0], seeded[id][1]] : [result(FEED[id][0].from, FEED[id][0].take), result(FEED[id][1].from, FEED[id][1].take)];
    const [a, b] = slots[id];
    const live = a && b && (id !== "GF-M2" || clean["GF-M1"] === slots["GF-M1"][1]);
    if (live && picks[id] && (picks[id] === a || picks[id] === b)) clean[id] = picks[id];
  }
  const resetLive = !!clean["GF-M1"] && clean["GF-M1"] === slots["GF-M1"][1];
  const total = ORDER.length - (resetLive ? 0 : 1);
  const champion = resetLive ? (clean["GF-M2"] ?? null) : (clean["GF-M1"] ?? null);
  return { slots, picks: clean, total, resetLive, champion };
}

export function score(picks: Picks, actual: Picks) {
  let points = 0;
  let correct = 0;
  for (const [id, team] of Object.entries(picks)) {
    if (actual[id] && actual[id] === team) {
      points += pointsFor(id);
      correct++;
    }
  }
  return { points, correct };
}
