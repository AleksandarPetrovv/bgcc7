import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { currentEdition, db } from "./index";
import { settings } from "./schema";

// host edits to the info page text, keyed "<lang>:<dict path>"; bgcc7 only
export const getInfoCopy = cache(async (): Promise<Record<string, string>> => {
  if (currentEdition() !== "bgcc7") return {};
  const [row] = await db.select({ copy: settings.copy }).from(settings).where(eq(settings.id, 1)).limit(1).catch(() => []);
  return row?.copy ?? {};
});

export async function setInfoCopy(key: string, text: string | null) {
  const patch = text === null ? sql`${settings.copy} - ${key}` : sql`${settings.copy} || ${JSON.stringify({ [key]: text })}::jsonb`;
  await db.update(settings).set({ copy: patch as never }).where(eq(settings.id, 1));
}
