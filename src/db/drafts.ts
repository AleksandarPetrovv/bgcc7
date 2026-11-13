import { db } from "./index";
import "server-only";
import { randomInt } from "node:crypto";
import { EventEmitter } from "node:events";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { drafts, matches, teamMembers, NO_TIMEOUTS, type DraftRules, type DraftUndo } from "./schema";
import { getPoolStages, poolMaps } from "./mappools";
import { DEFAULT_SETTINGS, getSettings } from "./settings";
import { getSkillLayouts } from "./format-plan";
import { siteRun } from "./site-run";
import { globalStore } from "@/lib/global-store";
import { getFormat } from "./edition";
import { deadline, pickableSlots, scoreOf, TB, tbDue, turnOf, type DraftView, type Side } from "@/lib/draft";

const bus = globalStore("draftBus", () => new EventEmitter().setMaxListeners(0));

export const emitDraft = (matchId: string) => bus.emit("change", matchId);
export function onDraft(fn: (matchId: string) => void) {
  bus.on("change", fn);
  return () => void bus.off("change", fn);
}

export const bumpDraft = () => ({ rev: sql`${drafts.rev} + 1`, updatedAt: new Date() });

type Row = typeof drafts.$inferSelect;

type Timers = { banSecs: number; pickSecs: number; stages: { slug: string; firstTo: number; hasTb: boolean }[] };

export async function timers(): Promise<Timers> {
  const [s, stages] = await Promise.all([getSettings(), getPoolStages()]);
  return {
    banSecs: s.banSecs,
    pickSecs: s.pickSecs,
    stages: stages.map((st) => ({ slug: st.slug, firstTo: st.firstTo, hasTb: st.pools.some((p) => p.category === "Tiebreaker" && p.maps.length > 0) })),
  };
}

const stageCfg = (c: Timers, slug: string) => c.stages.find((s) => s.slug === slug) ?? { firstTo: getFormat().firstTo, hasTb: false };

async function rulesFor(stageSlug: string): Promise<DraftRules> {
  const [c, stages] = await Promise.all([timers(), getPoolStages()]);
  const { firstTo, hasTb } = stageCfg(c, stageSlug);
  const maps = poolMaps(stages, stageSlug);
  return {
    firstTo,
    hasTb,
    banSecs: c.banSecs,
    pickSecs: c.pickSecs,
    slots: pickableSlots(maps),
    maps: Object.fromEntries(maps.map((m) => [m.slot, m])),
  };
}

export async function freshDraft(stageSlug: string) {
  const [rules, s, layouts] = await Promise.all([rulesFor(stageSlug), getSettings(), getSkillLayouts()]);
  return { stageSlug, rules, bans: layouts?.[stageSlug]?.bans ?? s.bans, banOrder: s.banOrder, steps: [], redo: [], turnAt: new Date(), pausedAt: null, pauseUntil: null, timeouts: NO_TIMEOUTS };
}

export async function rulesOf(matchId: string, stageSlug: string) {
  const [r] = await db.select({ rules: drafts.rules, stageSlug: drafts.stageSlug }).from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
  if (r?.rules && r.stageSlug === stageSlug) return { maps: Object.values(r.rules.maps), slots: r.rules.slots };
  const maps = poolMaps(await getPoolStages(), stageSlug);
  return { maps, slots: pickableSlots(maps) };
}

const slotsOf = async (r: Pick<Row, "rules" | "stageSlug">) => r.rules?.slots ?? pickableSlots(poolMaps(await getPoolStages(), r.stageSlug));

export const toView = (r: Row, c: Timers = { banSecs: DEFAULT_SETTINGS.banSecs, pickSecs: DEFAULT_SETTINGS.pickSecs, stages: [] }): DraftView => ({
  open: r.open,
  stageSlug: r.stageSlug,
  bans: r.bans,
  banOrder: r.banOrder === "abba" ? "abba" : "abab",
  roll1: r.roll1,
  roll2: r.roll2,
  choice: r.choice === "pick" || r.choice === "ban" ? r.choice : null,
  steps: r.steps,
  rev: r.rev,
  turnAt: r.turnAt?.toISOString() ?? null,
  pausedAt: r.pausedAt?.toISOString() ?? null,
  pauseUntil: r.pauseUntil?.toISOString() ?? null,
  timeouts: r.timeouts ?? NO_TIMEOUTS,
  now: Date.now(),
  banSecs: r.rules?.banSecs ?? c.banSecs,
  pickSecs: r.rules?.pickSecs ?? c.pickSecs,
  firstTo: r.rules?.firstTo ?? stageCfg(c, r.stageSlug).firstTo,
  hasTb: r.rules?.hasTb ?? stageCfg(c, r.stageSlug).hasTb,
  undo: undoPlan(r),
  redo: r.redo?.at(-1) ?? null,
});

function undoPlan(r: Pick<Row, "steps" | "choice" | "roll1" | "roll2">): DraftUndo | null {
  const tail = r.steps.at(-1);
  const core = tail?.auto && tail.slot === TB && !tail.winner ? r.steps.slice(0, -1) : r.steps;
  const last = core.at(-1);
  if (last?.kind === "pick" && !last.skip && last.winner) return { kind: "winner", slot: last.slot, winner: last.winner };
  if (tail) return { kind: "step", step: tail };
  if (r.choice) return { kind: "choice", choice: r.choice };
  if (r.roll1 != null || r.roll2 != null) return { kind: "rolls", roll1: r.roll1, roll2: r.roll2 };
  return null;
}

// both lock the draft row like every other draft write; a result undo goes through setResult, which locks it itself
export async function undoStep(matchId: string) {
  const out = await db.transaction(async (tx) => {
    const [d] = await tx.select().from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    if (!d) return null;
    const u = undoPlan(d);
    if (!u) return null;
    const redo = [...(d.redo ?? []), u];
    if (u.kind === "winner") return { u, redo };
    const patch = u.kind === "step" ? { steps: d.steps.slice(0, -1) } : u.kind === "choice" ? { choice: null } : { roll1: null, roll2: null };
    await tx
      .update(drafts)
      .set({ ...patch, redo, turnAt: d.pausedAt ?? new Date(), ...bumpDraft() })
      .where(eq(drafts.matchId, matchId));
    return { u, redo: null };
  });
  if (!out) return null;
  if (out.u.kind === "winner" && out.redo) await setResult(matchId, out.u.slot, null, out.redo);
  else emitDraft(matchId);
  return out.u;
}

export async function redoStep(matchId: string) {
  const out = await db.transaction(async (tx) => {
    const [d] = await tx.select().from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    const r = d?.redo?.at(-1);
    if (!d || !r) return null;
    const redo = d.redo.slice(0, -1);
    if (r.kind === "winner") return { r, redo };
    const patch = r.kind === "step" ? { steps: [...d.steps, r.step] } : r.kind === "choice" ? { choice: r.choice } : { roll1: r.roll1, roll2: r.roll2 };
    await tx
      .update(drafts)
      .set({ ...patch, redo, turnAt: d.pausedAt ?? new Date(), ...bumpDraft() })
      .where(eq(drafts.matchId, matchId));
    return { r, redo: null };
  });
  if (!out) return null;
  if (out.r.kind === "winner" && out.redo) await setResult(matchId, out.r.slot, out.r.winner, out.redo);
  else emitDraft(matchId);
  return out.r;
}

export async function getDraft(matchId: string) {
  const c = await timers();
  const [row] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
  return row ? toView(row, c) : null;
}

function due(d: DraftView, slots: string[], now: number) {
  if (d.pausedAt) return !!d.pauseUntil && now >= new Date(d.pauseUntil).getTime();
  const dl = deadline(d, slots);
  return dl != null && now >= dl;
}

export async function settle(matchId: string) {
  const c = await timers();
  const d = await getDraft(matchId);
  if (!d?.open) return d;
  const { slots } = await rulesOf(matchId, d.stageSlug);
  if (!due(d, slots, Date.now())) return d;
  const next = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    if (!row) return null;
    const now = Date.now();
    let turnAt = row.turnAt?.getTime() ?? now;
    let pausedAt = row.pausedAt;
    let pauseUntil = row.pauseUntil;
    let timeouts = row.timeouts;
    const steps = [...row.steps];
    if (pausedAt && pauseUntil && now >= pauseUntil.getTime()) {
      turnAt += pauseUntil.getTime() - pausedAt.getTime();
      pausedAt = null;
      pauseUntil = null;
      timeouts = { ...timeouts, on: null };
    }
    if (!pausedAt) {
      for (let guard = 0; guard < 64; guard++) {
        const v = { ...toView(row, c), steps, turnAt: new Date(turnAt).toISOString(), pausedAt: null };
        const dl = deadline(v, slots);
        const turn = turnOf(v, slots);
        if (dl == null || now < dl || (turn.kind !== "ban" && turn.kind !== "pick")) break;
        steps.push({ team: turn.team, kind: turn.kind, slot: "", skip: true });
        turnAt = dl;
      }
    }
    const [out] = await tx
      .update(drafts)
      .set({ steps, ...(steps.length !== row.steps.length ? { redo: [] } : {}), turnAt: new Date(turnAt), pausedAt, pauseUntil, timeouts, ...bumpDraft() })
      .where(eq(drafts.matchId, matchId))
      .returning();
    return toView(out, c);
  });
  emitDraft(matchId);
  return next;
}

export async function lobbyTimer(matchId: string, secs: number | null) {
  await settle(matchId);
  const [d] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
  if (!d?.open || (!secs && !d.pausedAt)) return;
  const now = Date.now();
  const turnAt = d.pausedAt ? new Date((d.turnAt?.getTime() ?? now) + (now - d.pausedAt.getTime())) : d.turnAt;
  const pause = secs ? { pausedAt: new Date(now), pauseUntil: new Date(now + secs * 1000) } : { pausedAt: null, pauseUntil: null, timeouts: { ...d.timeouts, on: null } };
  await db
    .update(drafts)
    .set({ turnAt, ...pause, ...bumpDraft() })
    .where(eq(drafts.matchId, matchId));
  emitDraft(matchId);
}

export async function requestTimeout(matchId: string, side: Side) {
  const res = await db.transaction(async (tx) => {
    const [row] = await tx.select({ open: drafts.open, timeouts: drafts.timeouts }).from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    if (!row?.open) return "closed" as const;
    const t = row.timeouts;
    if (t.used.includes(side) || t.queue.includes(side)) return "used" as const;
    await tx
      .update(drafts)
      .set({ timeouts: { ...t, queue: [...t.queue, side] }, ...bumpDraft() })
      .where(eq(drafts.matchId, matchId));
    return "ok" as const;
  });
  if (res === "ok") emitDraft(matchId);
  return res;
}

export async function answerTimeout(matchId: string, side: Side, accept: boolean) {
  const ok = await db.transaction(async (tx) => {
    const [row] = await tx.select({ timeouts: drafts.timeouts }).from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    const t = row?.timeouts;
    if (!t || t.queue[0] !== side) return false;
    const next = { queue: t.queue.slice(1), used: accept ? [...t.used, side] : t.used, on: accept ? side : t.on };
    await tx.update(drafts).set({ timeouts: next, ...bumpDraft() }).where(eq(drafts.matchId, matchId));
    return true;
  });
  if (!ok) return null;
  if (accept) await lobbyTimer(matchId, (await getSettings()).timeoutSecs);
  else emitDraft(matchId);
  return true;
}

export async function isPlayer(osuId: number) {
  const [row] = await db
    .select({ id: teamMembers.osuId })
    .from(teamMembers)
    .where(eq(teamMembers.osuId, osuId))
    .limit(1)
    .catch(() => []);
  return !!row;
}

export async function myOpenDraft(osuId: number) {
  const id = await myOpenId(osuId);
  return id || null;
}

export async function myDraftClock(osuId: number) {
  const id = await myOpenId(osuId);
  if (!id) return { slug: null, end: null, pause: false, now: Date.now() };
  const d = await settle(id);
  const end = !d ? null : d.pausedAt ? (d.pauseUntil ? new Date(d.pauseUntil).getTime() : null) : deadline(d, (await rulesOf(id, d.stageSlug)).slots);
  return { slug: id, end, pause: !!d?.pausedAt, now: Date.now() };
}

async function myOpenId(osuId: number) {
  const [cap] = await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.osuId, osuId)).limit(1);
  if (!cap) return null;
  const [row] = await db
    .select({ id: matches.id, referee: matches.referee })
    .from(drafts)
    .innerJoin(matches, eq(matches.id, drafts.matchId))
    .where(and(eq(drafts.open, true), isNull(matches.winner), or(eq(matches.team1Id, cap.teamId), eq(matches.team2Id, cap.teamId))))
    .limit(1);
  return row && (await siteRun(row)).onSite ? row.id : null;
}

export type DraftAct = { act: "roll" } | { act: "choose"; value: "pick" | "ban" } | { act: "ban" | "pick"; slot: string };

export async function applyDraft(matchId: string, side: Side, a: DraftAct) {
  await settle(matchId);
  const c = await timers();
  const res = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    if (!row?.open) return "closed" as const;
    if (row.pausedAt) return "paused" as const;
    const d = toView(row, c);
    const slots = await slotsOf(row);
    const turn = turnOf(d, slots);
    const patch: Partial<Row> = {};
    if (a.act === "roll") {
      if (turn.kind === "roll" && (side === 1 ? d.roll1 : d.roll2) == null) patch[side === 1 ? "roll1" : "roll2"] = randomInt(1, 101);
      else if (turn.kind === "tie") Object.assign(patch, side === 1 ? { roll1: randomInt(1, 101), roll2: null } : { roll2: randomInt(1, 101), roll1: null });
      else return "turn" as const;
    } else if (a.act === "choose") {
      if (turn.kind !== "choose" || turn.team !== side || (a.value !== "pick" && a.value !== "ban")) return "turn" as const;
      patch.choice = a.value;
    } else {
      if (turn.kind !== a.act || turn.team !== side) return "turn" as const;
      if (!slots.includes(a.slot) || d.steps.some((s) => s.slot === a.slot)) return "invalid" as const;
      patch.steps = [...d.steps, { team: side, kind: a.act, slot: a.slot }];
    }
    const [next] = await tx
      .update(drafts)
      .set({ ...patch, redo: [], turnAt: new Date(), ...bumpDraft() })
      .where(eq(drafts.matchId, matchId))
      .returning();
    return toView(next, c);
  });
  if (typeof res !== "string") emitDraft(matchId);
  return res;
}

/** fallback for a missed irc finish: the osu! match history's last finished game on the last pick's map decides an undecided pick */
export async function fillWinner(matchId: string, maps: { slot: string | null; winner: 0 | 1 | 2; note: string | null }[]) {
  const [row] = await db.select({ open: drafts.open, steps: drafts.steps }).from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
  const pick = row?.open ? row.steps.findLast((s) => s.kind === "pick" && !s.skip) : undefined;
  if (!pick || pick.winner) return;
  const hit = maps.findLast((m) => m.slot === pick.slot && !m.note && m.winner);
  if (hit) await setResult(matchId, pick.slot, hit.winner as Side);
}

export async function setResult(matchId: string, slot: string, winner: Side | null, redo: DraftUndo[] = []) {
  const c = await timers();
  const res = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    if (!row) return "closed" as const;
    const i = row.steps.findIndex((s) => s.kind === "pick" && !s.skip && s.slot === slot);
    if (i < 0) return "invalid" as const;
    let steps = row.steps.map((s, k) => (k === i ? { ...s, winner: winner ?? undefined } : s));
    const lastPick = row.steps.findLastIndex((s) => s.kind === "pick" && !s.skip) === i;
    const base = toView({ ...row, steps }, c);
    const tbOpen = steps.findIndex((s) => s.slot === TB && s.auto && !s.winner);
    const [s1, s2] = scoreOf(base);
    if (tbOpen >= 0 && !(s1 === base.firstTo - 1 && s2 === base.firstTo - 1)) steps = steps.filter((_, k) => k !== tbOpen);
    else if (tbDue(base)) {
      const t = turnOf({ ...base, hasTb: false, firstTo: 0 }, await slotsOf(row));
      steps = [...steps, { team: "team" in t ? t.team : 1, kind: "pick", slot: TB, auto: true }];
    }
    const [next] = await tx
      .update(drafts)
      .set({ steps, redo, ...(lastPick || steps.length !== row.steps.length ? { turnAt: new Date() } : {}), ...bumpDraft() })
      .where(eq(drafts.matchId, matchId))
      .returning();
    return toView(next, c);
  });
  if (typeof res !== "string") emitDraft(matchId);
  return res;
}
