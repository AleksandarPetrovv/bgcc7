"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { drafts, matches } from "@/db/schema";
import { emitDraft } from "@/db/drafts";
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
    const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const stage = (await getPoolStages()).find((s) => s.slug === stageSlug && s.pools.length);
    if (!m || !stage) return { ok: false, error: "invalid" };
    const [cur] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
    const s = await getSettings();
    if (cur) {
      const fresh = cur.stageSlug !== stageSlug;
      await db
        .update(drafts)
        .set({ open: true, stageSlug, ...(fresh ? { steps: [], bans: s.bans, banOrder: s.banOrder, turnAt: new Date(), pausedAt: null, pauseUntil: null } : {}), ...bump })
        .where(eq(drafts.matchId, matchId));
    } else await db.insert(drafts).values({ matchId, stageSlug, bans: s.bans, banOrder: s.banOrder, turnAt: new Date() });
    return done(matchId, { matchId, stage: stage.title });
  });
}

export async function closeDraft(matchId: string) {
  return guard("matches", "draft.close", async () => {
    await db.update(drafts).set({ open: false, ...bump }).where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}

export async function resetDraft(matchId: string) {
  return guard("matches", "draft.reset", async () => {
    const s = await getSettings();
    await db
      .update(drafts)
      .set({ roll1: null, roll2: null, choice: null, steps: [], bans: s.bans, banOrder: s.banOrder, turnAt: new Date(), pausedAt: null, pauseUntil: null, ...bump })
      .where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}

export async function undoDraft(matchId: string) {
  return guard("matches", "draft.undo", async () => {
    const [d] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
    if (!d) return { ok: false, error: "notFound" };
    const patch = d.steps.length
      ? { steps: d.steps.slice(0, -1) }
      : d.choice
        ? { choice: null }
        : { roll1: null, roll2: null };
    await db.update(drafts).set({ ...patch, turnAt: d.pausedAt ?? new Date(), ...bump }).where(eq(drafts.matchId, matchId));
    const last = d.steps.at(-1);
    return done(matchId, { matchId, step: last ? `${last.kind} ${last.slot}` : d.choice ? "choice" : "rolls" });
  });
}

export async function endDraft(matchId: string) {
  return guard("matches", "draft.end", async () => {
    await db.delete(drafts).where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}

export async function pauseDraft(matchId: string) {
  return guard("matches", "draft.pause", async () => {
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

export async function resumeDraft(matchId: string) {
  return guard("matches", "draft.resume", async () => {
    const [d] = await db.select().from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
    if (!d?.pausedAt) return { ok: true };
    const now = Date.now();
    const turnAt = new Date((d.turnAt?.getTime() ?? now) + (now - d.pausedAt.getTime()));
    await db.update(drafts).set({ turnAt, pausedAt: null, pauseUntil: null, ...bump }).where(eq(drafts.matchId, matchId));
    return done(matchId, { matchId });
  });
}
