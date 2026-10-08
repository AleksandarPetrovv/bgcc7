"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentOsuId } from "@/auth";
import { db } from "@/db";
import { lobbyBookings, registrations } from "@/db/schema";
import { getSettings } from "@/db/settings";
import { saveOsuUser } from "@/db/users";
import { getUser } from "@/lib/osu-api";
import { log } from "@/lib/authz";
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
  const added = await db.insert(registrations).values({ osuId }).onConflictDoNothing().returning({ osuId: registrations.osuId });
  if (added.length) await log(osuId, "register.signup");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function withdraw() {
  const osuId = await currentOsuId();
  if (!osuId) return { ok: false as const, error: "auth" };
  const s = await getSettings();
  if (windowState(s.regOpensAt, s.regClosesAt) !== "open") return { ok: false as const, error: "closed" };
  const gone = await db.delete(registrations).where(eq(registrations.osuId, osuId)).returning({ osuId: registrations.osuId });
  await db.delete(lobbyBookings).where(eq(lobbyBookings.osuId, osuId));
  if (gone.length) await log(osuId, "register.withdraw");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
