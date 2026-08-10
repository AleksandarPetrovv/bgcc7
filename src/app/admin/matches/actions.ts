"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matchCache, matches, reschedules, stages, teams } from "@/db/schema";
import { guard } from "@/lib/admin-action";
import { FEED } from "@/lib/pickems";
import type { ActionResult } from "@/lib/roles";
import { fromSofiaInput } from "@/lib/time";

async function advance() {
  const rows = await db.select().from(matches).orderBy(matches.order);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const result = (id: string, take: "W" | "L") => {
    const m = byId.get(id);
    if (!m?.winner || !m.team1Id || !m.team2Id) return null;
    const w = m.winner === 1 ? m.team1Id : m.team2Id;
    return take === "W" ? w : w === m.team1Id ? m.team2Id : m.team1Id;
  };
  for (const r of rows) {
    const feed = FEED[r.id];
    if (!feed || r.manual) continue;
    const team1Id = result(feed[0].from, feed[0].take);
    const team2Id = result(feed[1].from, feed[1].take);
    if (team1Id !== r.team1Id || team2Id !== r.team2Id) {
      await db.update(matches).set({ team1Id, team2Id }).where(eq(matches.id, r.id));
      byId.set(r.id, { ...r, team1Id, team2Id });
    }
  }
}

const text = (fd: FormData, k: string, max = 120) => String(fd.get(k) ?? "").trim().slice(0, max) || null;
const num = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  if (!v) return null;
  const n = Math.round(Number(v));
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : undefined;
};

export async function saveMatch(id: string, _: ActionResult, fd: FormData) {
  return guard("matches", "match.save", async () => {
    const [m] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!m) return { ok: false, error: "notFound" };
    const score1 = num(fd, "score1");
    const score2 = num(fd, "score2");
    if (score1 === undefined || score2 === undefined) return { ok: false, error: "invalid" };
    const vodUrl = text(fd, "vodUrl", 300);
    if (vodUrl && !/^https:\/\//.test(vodUrl)) return { ok: false, error: "invalid" };
    const ids = new Set((await db.select({ id: teams.id }).from(teams)).map((t) => t.id));
    const team = (k: string) => {
      const v = String(fd.get(k) ?? "");
      return ids.has(v) ? v : null;
    };
    const [stage] = await db.select({ firstTo: stages.firstTo }).from(stages).where(eq(stages.slug, m.stageSlug)).limit(1);
    const firstTo = stage?.firstTo ?? 7;
    const w = String(fd.get("winner") ?? "auto");
    const winner = w === "1" ? 1 : w === "2" ? 2 : w === "none" ? null : (score1 ?? 0) >= firstTo ? 1 : (score2 ?? 0) >= firstTo ? 2 : null;
    const mpLinks = (String(fd.get("mpLinks") ?? "").match(/\d{6,}/g) ?? []).join(",");
    const manual = fd.get("manual") === "on";
    const patch = {
      startsAt: fromSofiaInput(String(fd.get("startsAt") ?? "")),
      team1Id: manual || !FEED[id] ? team("team1Id") : m.team1Id,
      team2Id: manual || !FEED[id] ? team("team2Id") : m.team2Id,
      score1,
      score2,
      winner,
      mpLinks,
      referee: text(fd, "referee"),
      streamer: text(fd, "streamer"),
      commentators: text(fd, "commentators"),
      vodUrl,
      manual,
    };
    await db.update(matches).set(patch).where(eq(matches.id, id));
    if (mpLinks !== m.mpLinks || winner !== m.winner) await db.delete(matchCache).where(eq(matchCache.matchId, id));
    await advance();
    return { id, ...patch };
  });
}

export async function fillFromSeeds() {
  return guard("matches", "match.fillSeeds", async () => {
    const ts = await db.select().from(teams).orderBy(teams.seed);
    const bySeed = (n: number) => ts.find((t) => t.seed === n)?.id ?? null;
    const pairs: [string, number, number][] = [
      ["WB-R1-M1", 1, 8],
      ["WB-R1-M2", 4, 5],
      ["WB-R1-M3", 2, 7],
      ["WB-R1-M4", 3, 6],
    ];
    for (const [id, a, b] of pairs) await db.update(matches).set({ team1Id: bySeed(a), team2Id: bySeed(b) }).where(eq(matches.id, id));
    await advance();
    return { pairs };
  });
}

export async function resetBracket() {
  return guard("matches", "match.resetAll", async () => {
    await db.update(matches).set({ score1: null, score2: null, winner: null, manual: false, mpLinks: "" });
    await db.delete(matchCache);
    await advance();
    return {};
  });
}

export async function clearCache(id: string) {
  return guard("matches", "match.clearCache", async () => {
    await db.delete(matchCache).where(eq(matchCache.matchId, id));
    return { id };
  });
}

export async function decideReschedule(id: number, approve: boolean) {
  return guard("matches", approve ? "reschedule.approve" : "reschedule.deny", async (by) => {
    const [r] = await db.select().from(reschedules).where(eq(reschedules.id, id)).limit(1);
    if (!r || !["pending", "accepted"].includes(r.status)) return { ok: false, error: "notFound" };
    await db.update(reschedules).set({ status: approve ? "approved" : "denied", decidedBy: by }).where(eq(reschedules.id, id));
    if (approve) await db.update(matches).set({ startsAt: r.proposedAt }).where(eq(matches.id, r.matchId));
    return { id, matchId: r.matchId, proposedAt: r.proposedAt };
  });
}
