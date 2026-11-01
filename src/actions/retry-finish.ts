"use server";

import { firstToOf, getPoolStages } from "@/db/mappools";
import { forgetScoreboard, getScoreboard } from "@/db/scoreboards";
import { settleResult } from "@/db/match";
import { getMatches, getTeams } from "@/db/tournament";
import { decideWinner } from "@/lib/result";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/roles";
import { canRunMatch } from "@/lib/match-access";

export async function retryFinish(matchId: string): Promise<ActionResult> {
  return guard("matches", "match.retryFinish", async () => {
    if (!(await canRunMatch(matchId))) return { ok: false, error: "forbidden" };
    await forgetScoreboard(matchId);
    const [all, teams, stages] = await Promise.all([getMatches(), getTeams(), getPoolStages()]);
    const match = all.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: "notFound" };
    if (match.winner) return { matchId };
    const sb = await getScoreboard(match, teams, stages);
    const firstTo = firstToOf(stages, match.stage);
    if (!sb || !decideWinner(sb.score, firstTo)) return { ok: false, error: "invalid" };
    if (!(await settleResult(match, sb.score, firstTo))) return { ok: false };
    return { matchId };
  });
}
