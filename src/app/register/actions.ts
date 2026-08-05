"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentOsuId } from "@/auth";
import { db } from "@/db";
import { registrations, users } from "@/db/schema";

export async function signUp() {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false as const, error: "auth" };
  const [user] = await db.select({ country: users.country }).from(users).where(eq(users.osuId, osuId)).limit(1);
  if (user?.country !== "BG") return { ok: false as const, error: "notBg" };
  await db.insert(registrations).values({ osuId }).onConflictDoNothing();
  revalidatePath("/register");
  return { ok: true as const };
}

export async function withdraw() {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false as const, error: "auth" };
  await db.delete(registrations).where(eq(registrations.osuId, osuId));
  revalidatePath("/register");
  return { ok: true as const };
}
