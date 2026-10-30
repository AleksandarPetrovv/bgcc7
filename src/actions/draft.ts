"use server";

import { db } from "@/db";
import { eq, sql } from "drizzle-orm";

import { drafts, matches, type DraftUndo } from "@/db/schema";
import { answerTimeout, canRunMatch, emitDraft, freshDraft, redoStep, settle, undoStep } from "@/db/drafts";
import { abortTimer, sayTimer } from "@/lib/bancho";
import { getPoolStages } from "@/db/mappools";
import { getSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";

const bump = { rev: sql`${drafts.rev} + 1`, updatedAt: new Date() };

async function done<T>(matchId: string, res: T) {
  emitDraft(matchId);
  return res;
}

export async function openDraft(matchId: string, stageSlug: string) {
  return guard("matches", "draft.open", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const stage = (await getPoolStages()).find((s) => s.slug === stageSlug && s.pools.length);
    if (!m || !stage) return { ok: false, error: "invalid" };
    const [cur] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
    const fresh = await freshDraft(stageSlug);
    if (cur) {
      // a new stage starts over (the rolls stay); reopening restarts the current turn's clock so the closed time doesn't skip turns
      const same = cur.stageSlug === stageSlug;
      const reopen = same && !cur.open ? { turnAt: new Date(), pausedAt: null, pauseUntil: null } : {};
      await db
        .update(drafts)
        .set({ open: true, ...(same ? { ...reopen, ...(cur.rules ? {} : { rules: fresh.rules }) } : fresh), ...bump })
        .where(eq(drafts.matchId, matchId));
    } else await db.insert(drafts).values({ matchId, ...fresh });
    return done(matchId, { matchId, stage: stage.title });
  });
}

export async function closeDraft(matchId: string) {
  return guard("matches", "draft.close", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    await db.update(drafts).set({ open: false, ...bump }).where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}

export async function resetDraft(matchId: string) {
  return guard("matches", "draft.reset", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    const [cur] = await db.select({ stageSlug: drafts.stageSlug }).from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
    if (cur) await db.update(drafts).set({ ...(await freshDraft(cur.stageSlug)), roll1: null, roll2: null, choice: null, ...bump }).where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}

export async function undoDraft(matchId: string) {
  return guard("matches", "draft.undo", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    const u = await undoStep(matchId);
    if (!u) return { ok: false, error: "notFound" };
    return { matchId, step: stepLabel(u) };
  });
}

export async function redoDraft(matchId: string) {
  return guard("matches", "draft.redo", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    const r = await redoStep(matchId);
    if (!r) return { ok: false, error: "notFound" };
    return { matchId, step: stepLabel(r) };
  });
}

const stepLabel = (u: DraftUndo) => (u.kind === "winner" ? `${u.slot} win` : u.kind === "step" ? `${u.step.kind} ${u.step.slot || "skip"}` : u.kind === "choice" ? "choice" : "rolls");

export async function endDraft(matchId: string) {
  return guard("matches", "draft.end", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    await db.delete(drafts).where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}

export async function pauseDraft(matchId: string) {
  return guard("matches", "draft.pause", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    await settle(matchId);
    const [d] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
    if (!d) return { ok: false, error: "notFound" };
    if (d.pausedAt) return { ok: true };
    const now = new Date();
    const { timeoutSecs } = await getSettings();
    await db
      .update(drafts)
      .set({ pausedAt: now, pauseUntil: new Date(now.getTime() + timeoutSecs * 1000), ...bump })
      .where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}

export async function holdDraft(matchId: string) {
  return guard("matches", "draft.pause", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    await settle(matchId);
    const [d] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
    if (!d) return { ok: false, error: "notFound" };
    await db
      .update(drafts)
      .set({ pausedAt: d.pausedAt ?? new Date(), pauseUntil: null, ...bump })
      .where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}

export async function resumeDraft(matchId: string) {
  return guard("matches", "draft.resume", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    const [d] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
    if (!d?.pausedAt) return { ok: true };
    const now = Date.now();
    const turnAt = new Date((d.turnAt?.getTime() ?? now) + (now - d.pausedAt.getTime()));
    await db.update(drafts).set({ turnAt, pausedAt: null, pauseUntil: null, timeouts: { ...d.timeouts, on: null }, ...bump }).where(eq(drafts.matchId, matchId));
    // a timed pause is also an !mp timer in the lobby: stop that one too (no lobby = nothing to stop)
    if (d.pauseUntil) await abortTimer(matchId).catch(() => {});
    return done(matchId, { matchId });
  });
}

/** ref/host answers the oldest captain timeout request. accept pauses the draft and sends !mp timer to the lobby */
export async function answerTimeoutAct(matchId: string, side: 1 | 2, accept: boolean) {
  return guard("matches", accept ? "draft.timeoutAccept" : "draft.timeoutDecline", async () => {
    if (!(await canRunMatch(matchId)) || (side !== 1 && side !== 2)) return { ok: false, error: "forbidden" };
    if (!(await answerTimeout(matchId, side, accept))) return { ok: true };
    if (accept) await sayTimer(matchId, (await getSettings()).timeoutSecs).catch((e) => console.error("[draft] timeout timer", e));
    return { matchId, team: side };
  });
}
