import "server-only";
import { getMatches, getTeams } from "./tournament";
import { firstToOf, getPoolStages } from "./mappools";
import { forgetScoreboard, getScoreboard } from "./scoreboards";
import { settleResult } from "./match";
import { decideWinner } from "@/lib/result";

export type Refinish = "notFound" | "won" | "noBoard" | "undecided" | "failed" | "partial" | "ok";

/** re-reads the scoreboard and saves it. strict (retry): skips decided matches and saves only a decided result; otherwise a partial score is saved too ("partial") */
export async function refinishFromScoreboard(matchId: string, strict = false): Promise<Refinish> {
  await forgetScoreboard(matchId);
  const [all, teams, stages] = await Promise.all([getMatches(), getTeams(), getPoolStages()]);
  const match = all.find((m) => m.id === matchId);
  if (!match) return "notFound";
  if (strict && match.winner) return "won";
  const sb = await getScoreboard(match, teams, stages);
  if (!sb) return "noBoard";
  const firstTo = firstToOf(stages, match.stage);
  const decided = !!decideWinner(sb.score, firstTo);
  if (strict && !decided) return "undecided";
  if (!(await settleResult(match, sb.score, firstTo))) return "failed";
  return decided ? "ok" : "partial";
}
