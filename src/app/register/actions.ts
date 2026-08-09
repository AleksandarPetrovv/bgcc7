"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentOsuId } from "@/auth";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { getSettings } from "@/db/settings";
import { saveOsuUser } from "@/db/users";
import { getUser } from "@/lib/osu-api";
import { windowState } from "@/lib/time";

export async function signUp() {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false as const, error: "auth" };
  const s = await getSettings();
  if (!s.sections.register || windowState(s.regOpensAt, s.regClosesAt) !== "open") return { ok: false as const, error: "closed" };
  const u = await getUser(osuId).catch(() => null);
  if (!u) return { ok: false as const, error: "osu" };
  await saveOsuUser(u);
  if (u.country_code !== "BG") return { ok: false as const, error: "notBg" };
  await db.insert(registrations).values({ osuId }).onConflictDoNothing();
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function withdraw() {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false as const, error: "auth" };
  await db.delete(registrations).where(eq(registrations.osuId, osuId));
  revalidatePath("/", "layout");
  return { ok: true as const };
}
