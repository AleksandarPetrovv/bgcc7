import "server-only";
import { randomInt } from "node:crypto";
import { EventEmitter } from "node:events";
import { eq, ne, or } from "drizzle-orm";
import { isTestTeam, TEST_MATCH } from "@/lib/format";
import { BUILD } from "@/lib/build";
import { addPick, canRedo, drawDone, EMPTY_DRAW, setBracket, setEnded, nextWheel, onWheel, undoPick, type DrawFeed, type DrawOp, type DrawPlayer, type DrawState } from "@/lib/draw";
import { globalStore } from "@/lib/global-store";
import { db, ensureEdition, isBGCC6, type Tx } from "./index";
import { matches, pickems, settings, teamMembers, teams } from "./schema";
import { clearMatchChildren, realTeams } from "./match";
import { getFormat } from "./edition";
import { bwsRanking, getPlayerSeeds } from "./seeds";
import { getSettings } from "./settings";
import { resetPickems } from "./pickems";

export const newTeamId = () => `team_${crypto.randomUUID().slice(0, 8)}`;

/** teams by their players' average seed: index 0 is seed 1. null until every team exists */
async function seedOrder() {
  const f = getFormat();
  const [all, members] = await Promise.all([db.select().from(teams), db.select().from(teamMembers)]);
  const ts = all.filter((t) => !isTestTeam(t.id));
  if (ts.length !== f.teams) return null;
  const pos = await getPlayerSeeds();
  const seeds = (teamId: string) => members.filter((m) => m.teamId === teamId).map((m) => pos.get(m.osuId) ?? 999);
  return ts
    .map((t) => {
      const s = seeds(t.id);
      return { t, avg: s.length ? s.reduce((a, b) => a + b, 0) / s.length : 999, best: Math.min(...s, 999) };
    })
    .sort((a, b) => a.avg - b.avg || a.best - b.best);
}

/** empties every match (results, pickems, team slots) */
async function clearBracket(tx: Tx) {
  await clearMatchChildren(tx);
  await tx.delete(pickems);
  await tx.update(matches).set({ team1Id: null, team2Id: null, score1: null, score2: null, winner: null, manual: false }).where(ne(matches.id, TEST_MATCH.id));
}

export async function seedBracket() {
  const f = getFormat();
  if (isBGCC6()) return null;
  const order = await seedOrder();
  if (!order) return null;
  await db.transaction(async (tx) => {
    await clearBracket(tx);
    for (const [k, { t }] of order.entries()) await tx.update(teams).set({ seed: k + 1 }).where(eq(teams.id, t.id));
    for (const [k, [s1, s2]] of f.r1.entries()) await tx.update(matches).set({ team1Id: order[s1 - 1].t.id, team2Id: order[s2 - 1].t.id }).where(eq(matches.id, f.order[k]));
  });
  return order.map(({ t, avg }, k) => `#${k + 1} ${t.name} (${avg})`).join(", ");
}

const bus = globalStore("drawBus", () => new EventEmitter().setMaxListeners(0));
export function onDraw(fn: () => void) {
  bus.on("change", fn);
  return () => void bus.off("change", fn);
}

/** the draw runs only in the team draw phase of bgcc7 (two tiers, pairs of two) */
export const drawOpen = async () => !isBGCC6() && (await getSettings()).phase === "seeding";

async function tiers() {
  const f = getFormat();
  const seat = (p: { osuId: number; username: string; avatarUrl: string | null }, i: number): DrawPlayer => ({ id: p.osuId, name: p.username, avatar: p.avatarUrl, seed: i + 1 });
  const top = (await bwsRanking()).slice(0, 2 * f.teams).map(seat);
  return { a: top.slice(0, f.teams), b: top.slice(f.teams), full: top.length === 2 * f.teams };
}

// pairs whose team was deleted by hand drop out, players on teams made outside the draw are `taken`
async function current(q: Tx | typeof db, lock = false) {
  const sel = q.select({ draw: settings.draw }).from(settings).where(eq(settings.id, 1));
  const [[row], ts, members] = await Promise.all([lock ? sel.for("update") : sel, q.select({ id: teams.id }).from(teams).where(realTeams), q.select().from(teamMembers)]);
  const ids = new Set(ts.map((t) => t.id));
  const raw = row?.draw ?? EMPTY_DRAW;
  const pairs = raw.pairs.filter((p) => p.team === null || ids.has(p.team));
  const drawn = new Set(pairs.flatMap((p) => [p.a, p.b]));
  const taken = members.filter((m) => ids.has(m.teamId) && !drawn.has(m.osuId)).map((m) => m.osuId);
  return { state: { ...raw, pairs }, taken };
}

export async function drawFeed(): Promise<DrawFeed> {
  await ensureEdition();
  const [open, t, { state, taken }] = await Promise.all([drawOpen(), tiers(), current(db)]);
  const f = getFormat();
  const ended = !!state.ended && drawDone(state.pairs, f.teams);
  const seeds = ended ? await seedFeed(state) : null;
  const bracket = seeds && state.bracket != null ? { shown: state.bracket, r1: f.r1.map(([s1, s2]) => [seeds[s1 - 1].pair, seeds[s2 - 1].pair] as [number, number]) } : null;
  return { open, a: t.a, b: t.b, taken, pairs: state.pairs.map(({ a, b }) => ({ a, b })), seq: state.seq, last: state.last, redo: canRedo(state), ended, seeds, bracket, build: BUILD };
}

// the seed order the bracket is filled with, mapped onto the drawn pairs
async function seedFeed(s: DrawState) {
  const order = await seedOrder();
  if (!order) return null;
  const seeds = order.map(({ t, avg }) => ({ pair: s.pairs.findIndex((p) => p.team === t.id), avg }));
  return seeds.some((x) => x.pair < 0) ? null : seeds;
}

type Ctx = { tx: Tx; s: DrawState; t: Awaited<ReturnType<typeof tiers>>; taken: number[] };

/** one locked read-change-write of the draw; returns the picked or removed player's name, null when refused */
async function change(fn: (c: Ctx) => Promise<{ next: DrawState; name: string; same?: true } | null>, teamsChange = true) {
  if (!(await drawOpen())) return null;
  const t = await tiers();
  if (!t.full) return null;
  const name = await db.transaction(async (tx) => {
    const { state, taken } = await current(tx, true);
    const r = await fn({ tx, s: state, t, taken });
    if (!r) return null;
    await tx.update(settings).set({ draw: r.next }).where(eq(settings.id, 1));
    if (r.same) teamsChange = false;
    return r.name;
  });
  if (name === null) return null;
  if (teamsChange) await resetPickems();
  bus.emit("change");
  return name;
}

async function place({ tx, s, t, taken }: Ctx, op: DrawOp, kind: "spin" | "redo") {
  const p = onWheel(op.w === "a" ? t.a : t.b, s.pairs, taken).find((x) => x.id === op.id);
  if (!p) return null;
  let team: string | null = null;
  if (op.w === "b") {
    const cap = t.a.find((x) => x.id === s.pairs.at(-1)?.a);
    if (!cap) return null;
    team = newTeamId();
    const n = (await tx.select({ id: teams.id }).from(teams).where(realTeams)).length;
    await tx.insert(teams).values({ id: team, name: cap.name.slice(0, 40), seed: n + 1 });
    await tx.insert(teamMembers).values([
      { osuId: cap.id, teamId: team, isCaptain: true },
      { osuId: p.id, teamId: team, isCaptain: false },
    ]);
  }
  return { next: addPick(s, op, kind, team), name: p.name };
}

export const spinDraw = () =>
  change(async (c) => {
    const w = nextWheel(c.s.pairs);
    const pool = onWheel(w === "a" ? c.t.a : c.t.b, c.s.pairs, c.taken);
    return pool.length ? place(c, { w, id: pool[randomInt(pool.length)].id }, "spin") : null;
  });

/** the last team: a wheel down to one player is not spun, whoever is left on both wheels is placed in one go */
export const lastDraw = () =>
  change(async (c) => {
    let s = c.s;
    const names: string[] = [];
    for (const w of ["a", "b"] as const) {
      if (nextWheel(s.pairs) !== w) continue;
      const pool = onWheel(w === "a" ? c.t.a : c.t.b, s.pairs, c.taken);
      if (pool.length !== 1) break;
      const r = await place({ ...c, s }, { w, id: pool[0].id }, "spin");
      if (!r) return null;
      s = r.next;
      names.push(r.name);
    }
    return names.length ? { next: s, name: names.join(" + ") } : null;
  });

export const redoDraw = () =>
  change(async (c) => {
    const op = c.s.redo.at(-1);
    return op && canRedo(c.s) ? place(c, op, "redo") : null;
  });

/** the final teams screen; only a full draw can end, pickems stay since no team changed. undo takes it back */
export const endDraw = () => change(async ({ s }) => (s.ended || !drawDone(s.pairs, getFormat().teams) ? null : { next: setEnded(s, true), name: "" }), false);

/** after the final teams: open the bracket */
export const openBracket = () => change(async ({ s }) => (s.ended && s.bracket == null && drawDone(s.pairs, getFormat().teams) ? { next: setBracket(s, 0), name: "" } : null), false);

/** places the next team into the round of 16; the last one seeds the real bracket */
export async function revealBracket() {
  const slots = 2 * getFormat().r1.length;
  let full = false;
  const name = await change(async ({ s }) => {
    if (!s.ended || s.bracket == null || s.bracket >= slots) return null;
    const k = s.bracket;
    full = k + 1 === slots;
    return { next: setBracket(s, k + 1), name: `M${Math.floor(k / 2) + 1} ${(k % 2) + 1}/2` };
  }, false);
  if (name !== null && full) await seedBracket();
  return name;
}

export const undoDraw = () =>
  change(async ({ tx, s, t }) => {
    // after the draw, undo steps back through what was shown: bracket slots, the bracket, the final teams
    if (s.ended) {
      if (s.bracket != null) {
        if (s.bracket === 2 * getFormat().r1.length) await clearBracket(tx);
        return { next: setBracket(s, s.bracket > 0 ? s.bracket - 1 : null), name: "bracket", same: true };
      }
      return { next: setEnded(s, false), name: "teams", same: true };
    }
    const next = undoPick(s);
    const last = s.pairs.at(-1);
    if (!next || !last) return null;
    if (last.team) {
      // once the bracket is seeded the team is in a match; undoing would leave an empty slot
      const used = await tx.select({ id: matches.id }).from(matches).where(or(eq(matches.team1Id, last.team), eq(matches.team2Id, last.team))).limit(1);
      if (used.length) return null;
      await tx.delete(teams).where(eq(teams.id, last.team));
    }
    const id = next.last!.op.id;
    return { next, name: [...t.a, ...t.b].find((p) => p.id === id)?.name ?? String(id) };
  });
