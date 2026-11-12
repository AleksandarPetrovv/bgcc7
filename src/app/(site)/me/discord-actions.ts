"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { LINK_NAMES } from "@/lib/link-names";
import { globalStore } from "@/lib/global-store";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getViewer } from "@/lib/authz";
import { canLinkDiscord } from "@/db/schedule";
import { dropTeamRoles, later, roleNotices, syncTeams } from "@/db/discord-bot";
import { discordProfile, dm, findMember } from "@/lib/discord";

type Fail = "notFound" | "taken" | "failed" | "forbidden" | "dm" | "wait";
type Pending = { id: string; name: string; code: string; exp: number; sentAt: number; tries: number };

const CODE_TTL = 10 * 60_000;
const RESEND_AFTER = 30_000;
const leftSecs = (p: Pending) => Math.max(1, Math.ceil((p.sentAt + RESEND_AFTER - Date.now()) / 1000));
const MAX_TRIES = 5;
// one pending code per osu user, so linking proves the player owns that discord account
const codes = globalStore("bgccDiscordCodes", () => new Map<number, Pending>());

async function player() {
  const v = await getViewer();
  return v && canLinkDiscord() ? v.osuId : null;
}

const linkedId = async (osuId: number) => (await db.select({ d: users.discordId }).from(users).where(eq(users.osuId, osuId)).limit(1))[0]?.d ?? null;

const takenBy =async (discordId: string, osuId: number) =>
  !!(await db.select({ id: users.osuId }).from(users).where(and(eq(users.discordId, discordId), ne(users.osuId, osuId))).limit(1))[0];

export async function linkDiscord(name: string): Promise<{ ok: true; name: string; left: number } | { ok: false; error: Fail; left?: number; name?: string }> {
  const osuId = await player();
  if (!osuId) return { ok: false, error: "forbidden" };
  const prev = codes.get(osuId);
  if (prev && Date.now() - prev.sentAt < RESEND_AFTER) return { ok: false, error: "wait", left: leftSecs(prev), name: prev.exp > Date.now() ? prev.name : undefined };
  try {
    const m = await findMember(String(name).slice(0, 40));
    if (!m) return { ok: false, error: "notFound" };
    if (await takenBy(m.id, osuId)) return { ok: false, error: "taken" };
    const code = `${LINK_NAMES[randomInt(LINK_NAMES.length)]}_${String(randomInt(1000)).padStart(3, "0")}`;
    try {
      await dm(m.id, `Your BGCC7 verification code is \`${code}\`. It expires in 10 minutes. If you didn't ask for this, ignore it.`);
    } catch (e) {
      console.error("[discord] code dm", e);
      return { ok: false, error: "dm" };
    }
    const p = { id: m.id, name: m.name, code, exp: Date.now() + CODE_TTL, sentAt: Date.now(), tries: 0 };
    codes.set(osuId, p);
    return { ok: true, name: m.name, left: leftSecs(p) };
  } catch (e) {
    console.error("[discord] link", e);
    return { ok: false, error: "failed" };
  }
}

export async function confirmDiscord(code: string): Promise<{ ok: true; name: string } | { ok: false; error: "wrong" | "expired" | "taken" | "failed" | "forbidden" }> {
  const osuId = await player();
  if (!osuId) return { ok: false, error: "forbidden" };
  const p = codes.get(osuId);
  if (!p || p.exp < Date.now() || p.tries >= MAX_TRIES) {
    codes.delete(osuId);
    return { ok: false, error: "expired" };
  }
  p.tries++;
  const want = createHash("sha256").update(p.code.toLowerCase()).digest();
  const given = createHash("sha256").update(String(code).trim().toLowerCase().slice(0, 64)).digest();
  if (!timingSafeEqual(given, want)) return { ok: false, error: p.tries >= MAX_TRIES ? "expired" : "wrong" };
  codes.delete(osuId);
  try {
    if (await takenBy(p.id, osuId)) return { ok: false, error: "taken" };
    const old = await linkedId(osuId);
    await db.update(users).set({ discordId: p.id, discordName: p.name }).where(eq(users.osuId, osuId));
    if (old && old !== p.id) later("relink roles", () => dropTeamRoles(old));
    await discordProfile(p.id, true);
    later("sync", syncTeams);
    later("role notice", roleNotices);
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
  if (!v || !canLinkDiscord()) return { ok: false };
  try {
    const old = await linkedId(v.osuId);
    await db.update(users).set({ discordId: null, discordName: null }).where(eq(users.osuId, v.osuId));
    if (old) later("unlink roles", () => dropTeamRoles(old));
    later("sync", syncTeams);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[discord] unlink", e);
    return { ok: false };
  }
}
