"use server";

import { refinishFromScoreboard } from "@/db/refinish";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";

export async function retryFinish(matchId: string): Promise<ActionResult> {
  return guard("matches", "match.retryFinish", async () => {
    const r = await refinishFromScoreboard(matchId, true);
    if (r === "notFound") return { ok: false, error: "notFound" };
    if (r === "noBoard" || r === "undecided") return { ok: false, error: "invalid" };
    if (r === "failed") return { ok: false };
    return { log: { matchId } };
  }, { match: matchId });
}
