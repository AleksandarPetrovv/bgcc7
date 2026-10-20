"use server";

import { db } from "@/db";
import { revalidatePath } from "next/cache";
import { currentOsuId, signIn, signOut } from "@/auth";
import { getFormat } from "@/db/edition";
import { pickems } from "@/db/schema";
import { lockedOf, picksSchema, resolve, seedingOf } from "@/lib/pickems";
import { getPicks } from "@/db/queries";
import { getSettings } from "@/db/settings";
import { getMatches } from "@/db/tournament";

export async function savePickems(input: unknown) {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false as const, error: "auth" };
  const f = await getFormat();
  const parsed = picksSchema(f).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const [settings, matches] = await Promise.all([getSettings(), getMatches()]);
  if (!settings.pickemsOpen || !settings.sections.pickems) return { ok: false as const, error: "closed" };
  const locked = new Set(lockedOf(matches));
  const old = (await getPicks(osuId)) ?? {};
  const keep = (p: Record<string, string>, l: boolean) => Object.fromEntries(Object.entries(p).filter(([id]) => locked.has(id) === l));
  const { picks } = resolve(f, { ...keep(parsed.data as Record<string, string>, false), ...keep(old, true) }, seedingOf(matches));
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
