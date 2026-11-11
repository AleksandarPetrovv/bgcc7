"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { currentEdition, db, withEdition, type Tx } from "@/db";
import { availability, matches, reschedules } from "@/db/schema";
import { getSettings } from "@/db/settings";
import { getAllTeams } from "@/db/tournament";
import { when } from "@/lib/discord-text";
import { busyOf, lockMatch, mySchedule, notifyCaptain, pendingOf, schedulable, matchWeek, matchWeeks } from "@/db/schedule";
import { getMe } from "@/db/viewer";
import { siteUrl } from "@/lib/links";
import { teamNote } from "@/db/discord-bot";
import { fromSofiaInput } from "@/lib/time";
import { hourKeys, hourOf, inWindow, isOpen, offHours, weekOf } from "@/lib/schedule";

type Res = { ok: true } | { ok: false; error: "forbidden" | "closed" | "window" | "gone" | "failed" | "note" | "busy" };

const noteOf = (v: string) => {
  const n = String(v ?? "").trim().slice(0, 300);
  if (!n) throw new Stop("note");
  return n;
};
const quote = (n: string) => `\n> ${n.replace(/\s*\n\s*/g, " ")}`;
type Fail = Extract<Res, { ok: false }>["error"];

class Stop extends Error {
  constructor(public code: Fail) {
    super(code);
  }
}

async function captain() {
  const v = await getMe();
  if (!v) throw new Stop("forbidden");
  if ((await getSettings()).phase !== "playoffs") throw new Stop("forbidden");
  const team = v.captainOf;
  if (!team) throw new Stop("forbidden");
  return { osuId: v.osuId, team };
}

async function openMatch(tx: Tx, matchId: string, team: string, weeks: Record<string, string>) {
  const m = await lockMatch(tx, matchId);
  if (!m || !schedulable(m) || (m.team1Id !== team && m.team2Id !== team)) throw new Stop("gone");
  const w = weekOf(matchWeek(weeks, m.id));
  if (!w || !isOpen(w)) throw new Stop("closed");
  return { m, w };
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

export async function propose(matchId: string, input: string, noteIn: string): Promise<Res> {
  return run(async () => {
    const { osuId, team } = await captain();
    const note = noteOf(noteIn);
    const at = fromSofiaInput(input);
    const weeks = await matchWeeks();
    const { opp, counter } = await db.transaction(async (tx) => {
      const { m, w } = await openMatch(tx, matchId, team, weeks);
      if (!at || !inWindow(w, at) || offHours(input)) throw new Stop("window");
      const busy = (await busyOf([m.id])).get(m.id) ?? {};
      if (Object.values(busy).some((h) => h.includes(hourOf(input)))) throw new Stop("busy");
      const open = await pendingOf(tx, m.id);
      for (const p of open) {
        await tx
          .update(reschedules)
          .set(p.teamId === team ? { status: "withdrawn" } : { status: "rejected", answeredBy: osuId })
          .where(eq(reschedules.id, p.id));
      }
      await tx.insert(reschedules).values({ matchId: m.id, teamId: team, requestedBy: osuId, proposedAt: at, reason: note });
      return { opp: m.team1Id === team ? m.team2Id! : m.team1Id!, counter: open.some((p) => p.teamId !== team) };
    });
    const [from, to] = [await teamName(team), await teamName(opp)];
    const verb = counter ? "countered with" : "proposed";
    return async () => {
      await notifyCaptain(opp, (link) => `${from} ${verb} **${when(at!)}** for your match. Accept or counter: ${link}${quote(note)}`);
      await teamNote({
        [team]: `Your captain ${verb} **${when(at!)}** for your match against **${to}**. Waiting for their answer.${quote(note)}`,
        [opp]: `**${from}** ${verb} **${when(at!)}** for your match. Your captain can accept or counter: <${siteUrl()}/scheduling>${quote(note)}`,
      });
    };
  });
}

export async function accept(matchId: string, proposalId: number): Promise<Res> {
  return run(async () => {
    const { osuId, team } = await captain();
    const weeks = await matchWeeks();
    const { by, at } = await db.transaction(async (tx) => {
      const { m, w } = await openMatch(tx, matchId, team, weeks);
      const p = (await pendingOf(tx, m.id)).find((x) => x.id === proposalId);
      if (!p || p.teamId !== (m.team1Id === team ? m.team2Id : m.team1Id)) throw new Stop("gone");
      if (!inWindow(w, p.proposedAt)) throw new Stop("window");
      await tx.update(reschedules).set({ status: "cancelled", answeredBy: osuId }).where(and(eq(reschedules.matchId, m.id), eq(reschedules.status, "accepted")));
      await tx.update(reschedules).set({ status: "accepted", answeredBy: osuId }).where(eq(reschedules.id, p.id));
      await tx.update(matches).set({ startsAt: p.proposedAt }).where(eq(matches.id, m.id));
      return { by: p.teamId, at: p.proposedAt };
    });
    const [from, to] = [await teamName(team), await teamName(by)];
    return async () => {
      await notifyCaptain(by, (link) => `${from} accepted **${when(at)}**. Your match is set. ${link}`);
      await teamNote({ [team]: `Your match against **${to}** is set for **${when(at)}**.`, [by]: `Your match against **${from}** is set for **${when(at)}**.` });
    };
  });
}

export async function withdraw(matchId: string, noteIn: string): Promise<Res> {
  return run(async () => {
    const { osuId, team } = await captain();
    const note = noteOf(noteIn);
    const weeks = await matchWeeks();
    const { opp, agreed } = await db.transaction(async (tx) => {
      const { m } = await openMatch(tx, matchId, team, weeks);
      const mine = (await pendingOf(tx, m.id)).find((p) => p.teamId === team);
      if (mine) await tx.update(reschedules).set({ status: "withdrawn", reply: note }).where(eq(reschedules.id, mine.id));
      else if (m.startsAt) {
        await tx.update(matches).set({ startsAt: null }).where(eq(matches.id, m.id));
        await tx.update(reschedules).set({ status: "cancelled", answeredBy: osuId, reply: note }).where(and(eq(reschedules.matchId, m.id), eq(reschedules.status, "accepted")));
      } else throw new Stop("gone");
      return { opp: m.team1Id === team ? m.team2Id! : m.team1Id!, agreed: !mine };
    });
    const [from, to] = [await teamName(team), await teamName(opp)];
    return async () => {
      await notifyCaptain(opp, (link) => `${from} withdrew their scheduling proposal or agreed time. Check the match page: ${link}${quote(note)}`);
      const link = `<${siteUrl()}/scheduling>`;
      const q = quote(note);
      await teamNote(
        agreed
          ? { [team]: `The agreed time for your match against **${to}** was cleared. It's TBD again: ${link}${q}`, [opp]: `The agreed time for your match against **${from}** was cleared. It's TBD again: ${link}${q}` }
          : { [team]: `Your captain withdrew the proposal for your match against **${to}**.${q}`, [opp]: `**${from}** withdrew their proposal for your match.${q}` },
      );
    };
  });
}

export async function decline(matchId: string, proposalId: number, noteIn: string): Promise<Res> {
  return run(async () => {
    const { osuId, team } = await captain();
    const note = noteOf(noteIn);
    const weeks = await matchWeeks();
    const by = await db.transaction(async (tx) => {
      const { m } = await openMatch(tx, matchId, team, weeks);
      const p = (await pendingOf(tx, m.id)).find((x) => x.id === proposalId);
      if (!p || p.teamId === team) throw new Stop("gone");
      await tx.update(reschedules).set({ status: "rejected", answeredBy: osuId, reply: note }).where(eq(reschedules.id, p.id));
      return p.teamId;
    });
    const [from, to] = [await teamName(team), await teamName(by)];
    return async () => {
      await notifyCaptain(by, (link) => `${from} declined your proposed time. Propose another: ${link}${quote(note)}`);
      await teamNote({ [team]: `Your captain declined the time **${to}** proposed.${quote(note)}`, [by]: `**${from}** declined your proposed time. Your captain can propose another: <${siteUrl()}/scheduling>${quote(note)}` });
    };
  });
}

export async function setBusy(matchId: string, hours: string[]): Promise<Res> {
  return run(async () => {
    const v = await getMe();
    if (!v || (await getSettings()).phase !== "playoffs") throw new Stop("forbidden");
    const team = v.teamOf;
    const weeks = await matchWeeks();
    const m = (await db.select().from(matches).where(eq(matches.id, matchId)).limit(1))[0];
    if (!m || !team || (m.team1Id !== team && m.team2Id !== team) || !schedulable(m)) throw new Stop("forbidden");
    const w = weekOf(matchWeek(weeks, m.id));
    if (!w || !isOpen(w)) throw new Stop("closed");
    const ok = new Set(hourKeys(w.min, w.max));
    const busy = [...new Set(Array.isArray(hours) ? hours.filter((h) => typeof h === "string" && ok.has(h)) : [])].sort();
    await db
      .insert(availability)
      .values({ matchId, osuId: v.osuId, busy })
      .onConflictDoUpdate({ target: [availability.matchId, availability.osuId], set: { busy, updatedAt: new Date() } });
    return async () => {};
  });
}

export async function schedSig() {
  const v = await getMe();
  if (!v) return "";
  return createHash("sha1").update(JSON.stringify(await mySchedule(v.myTeam))).digest("hex");
}
