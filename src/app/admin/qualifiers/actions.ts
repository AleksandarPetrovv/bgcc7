"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { lobbies, qualScores, users } from "@/db/schema";
import { getQualifierMaps } from "@/db/mappools";
import { mpIds } from "@/db/lobbies";
import { saveOsuUser } from "@/db/users";
import { guard } from "@/lib/admin-action";
import { getMpMatch, getUser } from "@/lib/osu-api";
import type { ActionResult } from "@/lib/roles";

type Row = typeof qualScores.$inferInsert;

async function upsert(rows: Row[]) {
  for (const r of rows) {
    await db
      .insert(qualScores)
      .values(r)
      .onConflictDoUpdate({
        target: [qualScores.osuId, qualScores.beatmapId],
        set: { score: r.score, acc: r.acc, mods: r.mods, grade: r.grade, lobbyId: r.lobbyId, seeded: false },
        setWhere: sql`excluded.score > ${qualScores.score} or ${qualScores.seeded}`,
      });
  }
}

async function importLobby(lobbyId: number) {
  const [lobby] = await db.select().from(lobbies).where(eq(lobbies.id, lobbyId)).limit(1);
  if (!lobby) return 0;
  const pool = new Set((await getQualifierMaps()).map((m) => m.id));
  const rows: Row[] = [];
  for (const id of mpIds(lobby.mpLinks)) {
    const mp = await getMpMatch(id);
    for (const u of mp.users as { id: number; username: string; avatar_url: string; country_code?: string }[]) {
      await db
        .insert(users)
        .values({ osuId: u.id, username: u.username, avatarUrl: u.avatar_url, country: u.country_code ?? null })
        .onConflictDoNothing();
    }
    for (const e of mp.events) {
      const g = e.game;
      if (!g || !pool.has(g.beatmap_id) || !g.end_time) continue;
      for (const s of g.scores) {
        const mods = [...new Set([...(g.mods ?? []), ...(s.mods ?? [])])].join(",");
        rows.push({ osuId: s.user_id, beatmapId: g.beatmap_id, lobbyId, score: s.score, acc: Math.round(s.accuracy * 10000) / 100, mods, grade: s.rank });
      }
    }
  }
  const best = new Map<string, Row>();
  for (const r of rows) {
    const k = `${r.osuId}:${r.beatmapId}`;
    if (!best.has(k) || best.get(k)!.score < r.score) best.set(k, r);
  }
  await upsert([...best.values()]);
  return best.size;
}

export async function importOne(lobbyId: number) {
  return guard("qualifiers", "qual.import", async () => ({ lobbyId, scores: await importLobby(lobbyId) }));
}

export async function importAll() {
  return guard("qualifiers", "qual.importAll", async () => {
    const all = await db.select({ id: lobbies.id, mpLinks: lobbies.mpLinks }).from(lobbies);
    let scores = 0;
    for (const l of all) if (mpIds(l.mpLinks).length) scores += await importLobby(l.id);
    return { scores };
  });
}

export async function setScore(_: ActionResult, fd: FormData) {
  return guard("qualifiers", "qual.setScore", async () => {
    const q = String(fd.get("player") ?? "").trim();
    const beatmapId = Number(fd.get("beatmapId"));
    const score = Math.round(Number(fd.get("score")));
    const acc = Number(fd.get("acc"));
    const mods = String(fd.get("mods") ?? "").toUpperCase().replace(/[^A-Z,]/g, "").slice(0, 30);
    if (!q || !Number.isInteger(beatmapId) || !Number.isInteger(score) || score < 0 || !(acc >= 0 && acc <= 100)) return { ok: false, error: "invalid" };
    let osuId = Number(q);
    if (!Number.isInteger(osuId) || osuId <= 0) {
      const u = await getUser(q);
      if (!u) return { ok: false, error: "notFound" };
      await saveOsuUser(u);
      osuId = u.id;
    } else {
      const [known] = await db.select({ id: users.osuId }).from(users).where(eq(users.osuId, osuId)).limit(1);
      if (!known) {
        const u = await getUser(osuId);
        if (!u) return { ok: false, error: "notFound" };
        await saveOsuUser(u);
      }
    }
    const row = { osuId, beatmapId, score, acc, mods, grade: "", lobbyId: null, seeded: false };
    await db
      .insert(qualScores)
      .values(row)
      .onConflictDoUpdate({ target: [qualScores.osuId, qualScores.beatmapId], set: row });
    return row;
  });
}

export async function deleteScore(id: number) {
  return guard("qualifiers", "qual.deleteScore", async () => {
    const [row] = await db.delete(qualScores).where(eq(qualScores.id, id)).returning();
    return row ?? { id };
  });
}

export async function clearPlayer(osuId: number) {
  return guard("qualifiers", "qual.clearPlayer", async () => {
    await db.delete(qualScores).where(and(eq(qualScores.osuId, osuId)));
    return { osuId };
  });
}
