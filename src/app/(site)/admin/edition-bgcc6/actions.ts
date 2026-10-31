"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { EDITION_COOKIE, dbBGCC6, dbOf, setCurrentEdition, siteEdition } from "@/db";
import { settings, staff } from "@/db/schema";
import { currentOsuId } from "@/auth";
import { log } from "@/lib/authz";
import { cleanRoles } from "@/lib/roles";
import { isEdition } from "@/lib/format";

// host of the live edition, not of whatever edition the viewer's cookie points at
async function host() {
  const osuId = await currentOsuId();
  if (!osuId) return null;
  const [row] = await dbOf(siteEdition()).select({ roles: staff.permRoles }).from(staff).where(eq(staff.osuId, osuId)).limit(1);
  return cleanRoles(row?.roles ?? []).includes("host") ? osuId : null;
}

export async function switchEdition(edition: string) {
  const by = await host();
  if (!by || !isEdition(edition)) return { ok: false };
  await dbBGCC6.update(settings).set({ edition }).where(eq(settings.id, 1));
  setCurrentEdition(edition);
  (await cookies()).delete(EDITION_COOKIE);
  await log(by, "edition.switch", { edition });
  revalidatePath("/", "layout");
  return { ok: true };
}
