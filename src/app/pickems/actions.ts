"use server";

import { revalidatePath } from "next/cache";
import { currentOsuId, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { pickems } from "@/db/schema";
import { lockedMatches, picksSchema, resolve, seedingOf } from "@/lib/pickems";
import { getSettings } from "@/db/settings";
import { getMatches } from "@/db/tournament";
import { getPicks } from "@/db/queries";

export async function savePickems(input: unknown) {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false as const, error: "auth" };
  const parsed = picksSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const [settings, matches, old] = await Promise.all([getSettings(), getMatches(), getPicks(osuId)]);
  if (!settings.pickemsOpen || !settings.sections.pickems) return { ok: false as const, error: "closed" };
  const locked = lockedMatches(matches);
  const merged = { ...parsed.data };
  for (const id of locked) {
    if (old?.[id]) merged[id as keyof typeof merged] = old[id];
    else delete merged[id as keyof typeof merged];
  }
  const { picks } = resolve(merged, seedingOf(matches));
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
