import { db } from "@/db";
import { pickems } from "@/db/schema";
import { getFormat } from "@/db/edition";
import { getMatches } from "@/db/tournament";
import { pickemsWindow } from "@/lib/pickems";

/** an admin changed the teams or matchups: until the first match starts, every saved bracket (and so the leaderboard) starts over */
export async function resetPickems() {
  if (pickemsWindow(getFormat(), await getMatches()).started) return;
  await db.delete(pickems);
}
