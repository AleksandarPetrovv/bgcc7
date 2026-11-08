import { db } from "@/db";
import { pickems } from "@/db/schema";
import { getFormat } from "@/db/edition";
import { getMatches } from "@/db/tournament";
import { pickemsWindow } from "@/lib/pickems";

export async function resetPickems() {
  if (pickemsWindow(getFormat(), await getMatches()).started) return;
  await db.delete(pickems);
}
