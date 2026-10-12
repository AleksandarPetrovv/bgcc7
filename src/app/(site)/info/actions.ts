"use server";

import { revalidatePath } from "next/cache";
import { currentEdition } from "@/db";
import { setInfoCopy } from "@/db/info-copy";
import { getViewer, log } from "@/lib/authz";
import { getLang } from "@/lib/i18n/server";

export async function saveInfoText(path: string, text: string) {
  const v = await getViewer();
  if (!v?.roles.includes("host") || currentEdition() !== "bgcc7") return { ok: false };
  if (!/^info\.[\w.]{1,80}$/.test(path) || text.length > 4000) return { ok: false };
  const key = `${await getLang()}:${path}`;
  const clean = text.trim();
  // an empty save goes back to the default text
  await setInfoCopy(key, clean ? clean : null);
  await log(v.osuId, "info.edit", { key });
  revalidatePath("/info", "layout");
  return { ok: true };
}
