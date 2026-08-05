"use server";

import { revalidatePath } from "next/cache";
import { currentOsuId, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { pickems } from "@/db/schema";
import { picksSchema, resolve } from "@/lib/pickems";

export async function savePickems(input: unknown) {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false as const, error: "auth" };
  const parsed = picksSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const { picks } = resolve(parsed.data);
  await db
    .insert(pickems)
    .values({ osuId, picks })
    .onConflictDoUpdate({ target: pickems.osuId, set: { picks, updatedAt: new Date() } });
  revalidatePath("/pickems");
  return { ok: true as const };
}

export async function login(redirectTo: string) {
  await signIn("osu", { redirectTo: /^\/(?![/\\])/.test(redirectTo) ? redirectTo : "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
