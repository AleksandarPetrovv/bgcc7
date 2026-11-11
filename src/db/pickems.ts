import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pickems, settings } from "@/db/schema";
import { getFormat } from "@/db/edition";
import { getMatches } from "@/db/tournament";
import type { Match } from "@/lib/data";
import type { Format } from "@/lib/format";
import { pickemsWindow } from "@/lib/pickems";

/** the window plus the stored "already closed" fact; the first read that finds it closed saves that */
export async function pickemsState(f: Format, matches: Match[]) {
  const [row] = await db.select({ at: settings.pickemsClosedAt }).from(settings).where(eq(settings.id, 1)).limit(1);
  const w = pickemsWindow(f, matches, !!row?.at);
  if (w.started && row && !row.at) await db.update(settings).set({ pickemsClosedAt: new Date() }).where(eq(settings.id, 1));
  return w;
}

export async function resetPickems() {
  if ((await pickemsState(getFormat(), await getMatches())).started) return;
  await db.delete(pickems);
}
