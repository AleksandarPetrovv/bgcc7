"use server";

import { randomInt, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getViewer } from "@/lib/authz";
import { myCaptainTeam } from "@/db/schedule";
import { discordReady, dm, findMember } from "@/lib/discord";

type Fail = "notFound" | "taken" | "failed" | "forbidden" | "dm" | "wait";
type Pending = { id: string; name: string; code: string; exp: number; sentAt: number; tries: number };

const CODE_TTL = 10 * 60_000;
const RESEND_AFTER = 60_000;
const MAX_TRIES = 5;
// one pending code per osu user, so linking proves the player owns that discord account
const g = globalThis as unknown as { bgccDiscordCodes?: Map<number, Pending> };
const codes = (g.bgccDiscordCodes ??= new Map());

async function captain() {
  const v = await getViewer();
  return v && discordReady() && (await myCaptainTeam(v.osuId)) ? v.osuId : null;
}

const takenBy = async (discordId: string, osuId: number) =>
  !!(await db.select({ id: users.osuId }).from(users).where(and(eq(users.discordId, discordId), ne(users.osuId, osuId))).limit(1))[0];

export async function linkDiscord(name: string): Promise<{ ok: true; name: string } | { ok: false; error: Fail }> {
  const osuId = await captain();
  if (!osuId) return { ok: false, error: "forbidden" };
  const prev = codes.get(osuId);
  if (prev && Date.now() - prev.sentAt < RESEND_AFTER) {
    const same = String(name).trim().replace(/^@/, "").toLowerCase() === prev.name.toLowerCase();
    return same && prev.exp > Date.now() ? { ok: true, name: prev.name } : { ok: false, error: "wait" };
  }
  try {
    const m = await findMember(String(name).slice(0, 40));
    if (!m) return { ok: false, error: "notFound" };
    if (await takenBy(m.id, osuId)) return { ok: false, error: "taken" };
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    try {
      await dm(m.id, `Your BGCC7 verification code is **${code}**. It expires in 10 minutes. If you didn't ask for this, ignore it.`);
    } catch (e) {
      console.error("[discord] code dm", e);
      return { ok: false, error: "dm" };
    }
    codes.set(osuId, { id: m.id, name: m.name, code, exp: Date.now() + CODE_TTL, sentAt: Date.now(), tries: 0 });
    return { ok: true, name: m.name };
  } catch (e) {
    console.error("[discord] link", e);
    return { ok: false, error: "failed" };
  }
}

export async function confirmDiscord(code: string): Promise<{ ok: true; name: string } | { ok: false; error: "wrong" | "expired" | "taken" | "failed" | "forbidden" }> {
  const osuId = await captain();
  if (!osuId) return { ok: false, error: "forbidden" };
  const p = codes.get(osuId);
  if (!p || p.exp < Date.now() || p.tries >= MAX_TRIES) {
    codes.delete(osuId);
    return { ok: false, error: "expired" };
  }
  p.tries++;
  const given = Buffer.from(String(code).replace(/\D/g, "").slice(0, 6).padEnd(6, "x"));
  if (!timingSafeEqual(given, Buffer.from(p.code))) return { ok: false, error: p.tries >= MAX_TRIES ? "expired" : "wrong" };
  codes.delete(osuId);
  try {
    if (await takenBy(p.id, osuId)) return { ok: false, error: "taken" };
    await db.update(users).set({ discordId: p.id, discordName: p.name }).where(eq(users.osuId, osuId));
    revalidatePath("/", "layout");
    return { ok: true, name: p.name };
  } catch (e) {
    if ((e as { code?: string })?.code === "23505" || (e as { cause?: { code?: string } })?.cause?.code === "23505") return { ok: false, error: "taken" };
    console.error("[discord] link", e);
    return { ok: false, error: "failed" };
  }
}

export async function unlinkDiscord(): Promise<{ ok: boolean }> {
  const v = await getViewer();
  if (!v || !(await myCaptainTeam(v.osuId))) return { ok: false };
  try {
    await db.update(users).set({ discordId: null, discordName: null }).where(eq(users.osuId, v.osuId));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[discord] unlink", e);
    return { ok: false };
  }
}
