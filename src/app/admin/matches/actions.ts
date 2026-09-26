"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matchCache, matches, stages, teams } from "@/db/schema";
import { guard } from "@/lib/admin-action";
import { FEED } from "@/lib/pickems";
import type { ActionResult } from "@/lib/roles";
import { fromSofiaInput } from "@/lib/time";
import { advance } from "@/db/bracket";

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

export async function clearCache(id: string) {
  return guard("matches", "match.clearCache", async () => {
    await db.delete(matchCache).where(eq(matchCache.matchId, id));
    return { id };
  });
}
