"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db6, setCurrentEdition } from "@/db";
import { settings } from "@/db/schema";
import { getEdition } from "@/db/edition";
import { clearTestData, seedTestData } from "@/db/test-data";
import { getViewer, log } from "@/lib/authz";
import { isEdition } from "@/lib/format";

async function host() {
  const v = await getViewer();
  return v?.roles.includes("host") ? v.osuId : null;
}

export async function switchEdition(edition: string) {
  const by = await host();
  if (!by || !isEdition(edition)) return { ok: false };
  await db6.update(settings).set({ edition }).where(eq(settings.id, 1));
  setCurrentEdition(edition);
  await log(by, "edition.switch", { edition });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function seedTest() {
  const by = await host();
  if (!by || getEdition() !== "bgcc7") return { ok: false };
  try {
    await seedTestData();
  } catch (e) {
    console.error("[seed]", e);
    return { ok: false };
  }
  await log(by, "edition.seed");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearTest() {
  const by = await host();
  if (!by || getEdition() !== "bgcc7") return { ok: false };
  try {
    await clearTestData();
  } catch (e) {
    console.error("[seed clear]", e);
    return { ok: false };
  }
  await log(by, "edition.clear");
  revalidatePath("/", "layout");
  return { ok: true };
}
