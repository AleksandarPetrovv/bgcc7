import { z } from "zod";
import type { Match } from "@/lib/data";
import { roundOf, type Format } from "@/lib/format";

const pointsFor = (f: Format, id: string) => f.points[roundOf(id)] ?? 0;

export type Seeding = Record<string, readonly [string, string]>;
export const seedingOf = (matches: Match[]): Seeding =>
  Object.fromEntries(matches.filter((m) => m.id.startsWith("WB-R1")).map((m) => [m.id, [m.team1.id, m.team2.id] as const]));
export const actualOf = (matches: Match[]): Picks =>
  Object.fromEntries(matches.filter((m) => m.winner).map((m) => [m.id, m.winner === 1 ? m.team1.id : m.team2.id]));

export type Picks = Record<string, string>;

export const picksSchema = (f: Format) => z.record(z.enum(f.order as [string, ...string[]]), z.string().min(1).max(64));

export function resolve(f: Format, picks: Picks, seeded: Seeding) {
  const slots: Record<string, [string | null, string | null]> = {};
  const clean: Picks = {};
  const result = (id: string, take: "W" | "L") => {
    const w = clean[id];
    if (!w) return null;
    const [a, b] = slots[id];
    return take === "W" ? w : w === a ? b : a;
  };
  for (const id of f.order) {
    slots[id] = seeded[id] ? [seeded[id][0], seeded[id][1]] : [result(f.feed[id][0].from, f.feed[id][0].take), result(f.feed[id][1].from, f.feed[id][1].take)];
    const [a, b] = slots[id];
    const live = a && b && (id !== "GF-M2" || clean["GF-M1"] === slots["GF-M1"][1]);
    if (live && picks[id] && (picks[id] === a || picks[id] === b)) clean[id] = picks[id];
  }
  const resetLive = !!clean["GF-M1"] && clean["GF-M1"] === slots["GF-M1"][1];
  const total = f.order.length - (resetLive ? 0 : 1);
  const champion = resetLive ? (clean["GF-M2"] ?? null) : (clean["GF-M1"] ?? null);
  return { slots, picks: clean, total, resetLive, champion };
}

export function score(f: Format, picks: Picks, actual: Picks) {
  let points = 0;
  let correct = 0;
  for (const [id, team] of Object.entries(picks)) {
    if (actual[id] && actual[id] === team) {
      points += pointsFor(f, id);
      correct++;
    }
  }
  return { points, correct };
}
