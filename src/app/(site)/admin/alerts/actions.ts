"use server";

import { getPoolStages } from "@/db/mappools";
import { forgetScoreboard, getScoreboard, settleFinish } from "@/db/scoreboards";
import { getMatches, getTeams } from "@/db/tournament";
import { getFormat } from "@/db/edition";
import { canRunMatch } from "@/db/drafts";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";

export async function retryFinish(matchId: string): Promise<ActionResult> {
  return guard("matches", "match.retryFinish", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    await forgetScoreboard(matchId);
    const [all, teams, stages] = await Promise.all([getMatches(), getTeams(), getPoolStages()]);
    const match = all.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: "notFound" };
    if (match.winner) return { matchId };
    const sb = await getScoreboard(match, teams, stages);
    const firstTo = stages.find((s) => s.slug === match.stage)?.firstTo ?? getFormat().firstTo;
    if (!sb || Math.max(...sb.score) < firstTo) return { ok: false, error: "invalid" };
    if (!(await settleFinish(match, sb.score))) return { ok: false };
    return { matchId };
  });
}
