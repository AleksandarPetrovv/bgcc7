"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { currentEdition, db, withEdition } from "@/db";
import { matches, reschedules } from "@/db/schema";
import { getSettings } from "@/db/settings";
import { getAllTeams } from "@/db/tournament";
import { fmtAt, lockMatch, myCaptainTeam, notifyCaptain, pendingOf, schedulable, stageWeeks } from "@/db/schedule";
import { getViewer } from "@/lib/authz";
import { fromSofiaInput } from "@/lib/time";
import { inWindow, isOpen, weekOf } from "@/lib/schedule";

type Res = { ok: true } | { ok: false; error: "forbidden" | "closed" | "window" | "gone" | "failed" };
type Fail = Extract<Res, { ok: false }>["error"];

class Stop extends Error {
  constructor(public code: Fail) {
    super(code);
  }
}

async function captain() {
  const v = await getViewer();
  if (!v) throw new Stop("forbidden");
  if ((await getSettings()).phase !== "playoffs") throw new Stop("forbidden");
  const team = await myCaptainTeam(v.osuId);
  if (!team) throw new Stop("forbidden");
  return { osuId: v.osuId, team };
}

async function run(fn: () => Promise<() => Promise<void>>): Promise<Res> {
  try {
    const notify = await fn();
    revalidatePath("/", "layout");
    const ed = currentEdition();
    after(() => withEdition(ed, notify).catch((e) => console.error("[schedule] notify", e)));
    return { ok: true };
  } catch (e) {
    if (e instanceof Stop) return { ok: false, error: e.code };
    console.error("[schedule]", e);
    return { ok: false, error: "failed" };
  }
}

const teamName = async (id: string) => (await getAllTeams()).find((t) => t.id === id)?.name ?? id;

export async function propose(matchId: string, input: string): Promise<Res> {
  return run(async () => {
    const { osuId, team } = await captain();
    const at = fromSofiaInput(input);
    const weeks = await stageWeeks();
    const opp = await db.transaction(async (tx) => {
      const m = await lockMatch(tx, matchId);
      if (!m || !schedulable(m) || (m.team1Id !== team && m.team2Id !== team)) throw new Stop("gone");
      const w = weekOf(weeks[m.stageSlug]);
      if (!w || !isOpen(w)) throw new Stop("closed");
      if (!at || !inWindow(w, at)) throw new Stop("window");
      for (const p of await pendingOf(tx, m.id)) {
        await tx
          .update(reschedules)
          .set(p.teamId === team ? { status: "withdrawn" } : { status: "rejected", answeredBy: osuId })
          .where(eq(reschedules.id, p.id));
      }
      await tx.insert(reschedules).values({ matchId: m.id, teamId: team, requestedBy: osuId, proposedAt: at });
      return m.team1Id === team ? m.team2Id! : m.team1Id!;
    });
    const from = await teamName(team);
    return () => notifyCaptain(opp, (link) => `**BGCC7 scheduling**: ${from} proposed **${fmtAt(at!)}** for your match. Accept or counter: ${link}`);
  });
}

export async function accept(matchId: string, proposalId: number): Promise<Res> {
  return run(async () => {
    const { osuId, team } = await captain();
    const weeks = await stageWeeks();
    const { by, at } = await db.transaction(async (tx) => {
      const m = await lockMatch(tx, matchId);
      if (!m || !schedulable(m) || (m.team1Id !== team && m.team2Id !== team)) throw new Stop("gone");
      const w = weekOf(weeks[m.stageSlug]);
      if (!w || !isOpen(w)) throw new Stop("closed");
      const p = (await pendingOf(tx, m.id)).find((x) => x.id === proposalId);
      if (!p || p.teamId !== (m.team1Id === team ? m.team2Id : m.team1Id)) throw new Stop("gone");
      if (!inWindow(w, p.proposedAt)) throw new Stop("window");
      await tx.update(reschedules).set({ status: "cancelled", answeredBy: osuId }).where(and(eq(reschedules.matchId, m.id), eq(reschedules.status, "accepted")));
      await tx.update(reschedules).set({ status: "accepted", answeredBy: osuId }).where(eq(reschedules.id, p.id));
      await tx.update(matches).set({ startsAt: p.proposedAt }).where(eq(matches.id, m.id));
      return { by: p.teamId, at: p.proposedAt };
    });
    const from = await teamName(team);
    return () => notifyCaptain(by, (link) => `**BGCC7 scheduling**: ${from} accepted **${fmtAt(at)}**. Your match is set. ${link}`);
  });
}

export async function withdraw(matchId: string): Promise<Res> {
  return run(async () => {
    const { osuId, team } = await captain();
    const weeks = await stageWeeks();
    const opp = await db.transaction(async (tx) => {
      const m = await lockMatch(tx, matchId);
      if (!m || !schedulable(m) || (m.team1Id !== team && m.team2Id !== team)) throw new Stop("gone");
      const w = weekOf(weeks[m.stageSlug]);
      if (!w || !isOpen(w)) throw new Stop("closed");
      const mine = (await pendingOf(tx, m.id)).find((p) => p.teamId === team);
      if (mine) await tx.update(reschedules).set({ status: "withdrawn" }).where(eq(reschedules.id, mine.id));
      else if (m.startsAt) {
        await tx.update(matches).set({ startsAt: null }).where(eq(matches.id, m.id));
        await tx.update(reschedules).set({ status: "cancelled", answeredBy: osuId }).where(and(eq(reschedules.matchId, m.id), eq(reschedules.status, "accepted")));
      } else throw new Stop("gone");
      return m.team1Id === team ? m.team2Id! : m.team1Id!;
    });
    const from = await teamName(team);
    return () => notifyCaptain(opp, (link) => `**BGCC7 scheduling**: ${from} withdrew their scheduling proposal or agreed time. Check the match page: ${link}`);
  });
}
