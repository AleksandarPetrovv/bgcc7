import { db } from "./index";
import "server-only";
import { randomInt } from "node:crypto";
import { EventEmitter } from "node:events";
import { and, eq, or, sql } from "drizzle-orm";
import { drafts, matches, teamMembers } from "./schema";
import { getPoolStages } from "./mappools";
import { getSettings } from "./settings";
import { can } from "@/lib/roles";
import { getViewer } from "@/lib/authz";
import { matchSlug } from "@/lib/format";
import { getFormat } from "./edition";
import { deadline, pickable, scoreOf, tbDue, turnOf, type DraftView, type Side } from "@/lib/draft";

const g = globalThis as unknown as { draftBus?: EventEmitter };
const bus = (g.draftBus ??= new EventEmitter().setMaxListeners(0));

export const emitDraft = (matchId: string) => bus.emit("change", matchId);
export function onDraft(fn: (matchId: string) => void) {
  bus.on("change", fn);
  return () => void bus.off("change", fn);
}

type Row = typeof drafts.$inferSelect;

type Timers = { banSecs: number; pickSecs: number; stages: { slug: string; firstTo: number; hasTb: boolean }[] };

export async function timers(): Promise<Timers> {
  const [s, stages] = await Promise.all([getSettings(), getPoolStages()]);
  return {
    banSecs: s.banSecs,
    pickSecs: s.pickSecs,
    stages: stages.map((st) => ({ slug: st.slug, firstTo: st.firstTo ?? 7, hasTb: st.pools.some((p) => p.maps.some((m) => m.slot === "TB")) })),
  };
}

const stageCfg = (c: Timers, slug: string) => c.stages.find((s) => s.slug === slug) ?? { firstTo: 7, hasTb: false };

export const toView = (r: Row, c: Timers = { banSecs: 90, pickSecs: 120, stages: [] }): DraftView => ({
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
  now: Date.now(),
  banSecs: c.banSecs,
  pickSecs: c.pickSecs,
  firstTo: stageCfg(c, r.stageSlug).firstTo,
  hasTb: stageCfg(c, r.stageSlug).hasTb,
});

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
  const slots = await poolSlots(d.stageSlug);
  if (!due(d, slots, Date.now())) return d;
  const next = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    if (!row) return null;
    const now = Date.now();
    let turnAt = row.turnAt?.getTime() ?? now;
    let pausedAt = row.pausedAt;
    let pauseUntil = row.pauseUntil;
    const steps = [...row.steps];
    if (pausedAt && pauseUntil && now >= pauseUntil.getTime()) {
      turnAt += pauseUntil.getTime() - pausedAt.getTime();
      pausedAt = null;
      pauseUntil = null;
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
      .set({ steps, turnAt: new Date(turnAt), pausedAt, pauseUntil, rev: sql`${drafts.rev} + 1`, updatedAt: new Date() })
      .where(eq(drafts.matchId, matchId))
      .returning();
    return toView(out, c);
  });
  emitDraft(matchId);
  return next;
}

export async function lobbyTimer(matchId: string, secs: number | null) {
  const [d] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
  if (!d?.open || (!secs && !d.pausedAt)) return;
  const now = Date.now();
  const turnAt = d.pausedAt ? new Date((d.turnAt?.getTime() ?? now) + (now - d.pausedAt.getTime())) : d.turnAt;
  const pause = secs ? { pausedAt: new Date(now), pauseUntil: new Date(now + secs * 1000) } : { pausedAt: null, pauseUntil: null };
  await db
    .update(drafts)
    .set({ turnAt, ...pause, rev: sql`${drafts.rev} + 1`, updatedAt: new Date() })
    .where(eq(drafts.matchId, matchId));
  emitDraft(matchId);
}

export async function draftAccess(matchId: string) {
  const v = await getViewer();
  if (!v) return null;
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!m) return null;
  const admin = can(v.roles, "matches");
  const watch = can(v.roles, "draft");
  const [mem] = await db.select({ teamId: teamMembers.teamId, isCaptain: teamMembers.isCaptain }).from(teamMembers).where(eq(teamMembers.osuId, v.osuId)).limit(1);
  const team: Side | null = mem && mem.teamId === m.team1Id ? 1 : mem && mem.teamId === m.team2Id ? 2 : null;
  const side = team && mem?.isCaptain ? team : null;
  if (!admin && !watch && !team) return null;
  return { osuId: v.osuId, admin, side, match: m };
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
  return id ? matchSlug(await getFormat(), id) : null;
}

export async function myDraftClock(osuId: number) {
  const id = await myOpenId(osuId);
  if (!id) return { slug: null, end: null, pause: false, now: Date.now() };
  const d = await settle(id);
  const end = !d ? null : d.pausedAt ? (d.pauseUntil ? new Date(d.pauseUntil).getTime() : null) : deadline(d, await poolSlots(d.stageSlug));
  return { slug: matchSlug(await getFormat(), id), end, pause: !!d?.pausedAt, now: Date.now() };
}

async function myOpenId(osuId: number) {
  const [cap] = await db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.osuId, osuId)).limit(1);
  if (!cap) return null;
  const [row] = await db
    .select({ id: matches.id })
    .from(drafts)
    .innerJoin(matches, eq(matches.id, drafts.matchId))
    .where(and(eq(drafts.open, true), or(eq(matches.team1Id, cap.teamId), eq(matches.team2Id, cap.teamId))))
    .limit(1);
  return row?.id ?? null;
}

export async function poolSlots(stageSlug: string) {
  const stage = (await getPoolStages()).find((s) => s.slug === stageSlug);
  return (stage?.pools ?? []).flatMap((p) => p.maps.map((m) => m.slot)).filter(pickable);
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
    const slots = await poolSlots(d.stageSlug);
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
      .set({ ...patch, turnAt: new Date(), rev: sql`${drafts.rev} + 1`, updatedAt: new Date() })
      .where(eq(drafts.matchId, matchId))
      .returning();
    return toView(next, c);
  });
  if (typeof res !== "string") emitDraft(matchId);
  return res;
}

export async function setResult(matchId: string, slot: string, winner: Side | null) {
  const c = await timers();
  const res = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(drafts).where(eq(drafts.matchId, matchId)).for("update");
    if (!row) return "closed" as const;
    const i = row.steps.findIndex((s) => s.kind === "pick" && !s.skip && s.slot === slot);
    if (i < 0) return "invalid" as const;
    let steps = row.steps.map((s, k) => (k === i ? { ...s, winner: winner ?? undefined } : s));
    const lastPick = row.steps.findLastIndex((s) => s.kind === "pick" && !s.skip) === i;
    const base = toView({ ...row, steps }, c);
    const tbOpen = steps.findIndex((s) => s.slot === "TB" && s.auto && !s.winner);
    const [s1, s2] = scoreOf(base);
    if (tbOpen >= 0 && !(s1 === base.firstTo - 1 && s2 === base.firstTo - 1)) steps = steps.filter((_, k) => k !== tbOpen);
    else if (tbDue(base)) {
      const t = turnOf({ ...base, hasTb: false, firstTo: 0 }, await poolSlots(row.stageSlug));
      steps = [...steps, { team: "team" in t ? t.team : 1, kind: "pick", slot: "TB", auto: true }];
    }
    const [next] = await tx
      .update(drafts)
      .set({ steps, ...(lastPick || steps.length !== row.steps.length ? { turnAt: new Date() } : {}), rev: sql`${drafts.rev} + 1`, updatedAt: new Date() })
      .where(eq(drafts.matchId, matchId))
      .returning();
    return toView(next, c);
  });
  if (typeof res !== "string") emitDraft(matchId);
  return res;
}
