"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getViewer } from "@/lib/authz";
import { myCaptainTeam } from "@/db/schedule";
import { discordReady, findMember } from "@/lib/discord";

export async function linkDiscord(name: string): Promise<{ ok: true; name: string } | { ok: false; error: "notFound" | "taken" | "failed" | "forbidden" }> {
  const v = await getViewer();
  if (!v || !discordReady() || !(await myCaptainTeam(v.osuId))) return { ok: false, error: "forbidden" };
  try {
    const m = await findMember(String(name).slice(0, 40));
    if (!m) return { ok: false, error: "notFound" };
    const [dup] = await db.select({ id: users.osuId }).from(users).where(and(eq(users.discordId, m.id), ne(users.osuId, v.osuId))).limit(1);
    if (dup) return { ok: false, error: "taken" };
    await db.update(users).set({ discordId: m.id, discordName: m.name }).where(eq(users.osuId, v.osuId));
    revalidatePath("/", "layout");
    return { ok: true, name: m.name };
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
