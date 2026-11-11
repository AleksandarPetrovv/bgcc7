import "server-only";
import { GF, GF_RESET, isBracketStage, roundOf } from "@/lib/format";
import { PHASES, type Phase } from "@/lib/sections";
import type { PhaseWarning } from "@/lib/phase-warnings";
import { isBGCC6 } from "./index";
import { getFormat } from "./edition";
import { getSettings } from "./settings";
import { getRegistrations } from "./registrations";
import { bwsRanking } from "./seeds";
import { getMatches, getTeams } from "./tournament";
import { getPoolStages } from "./mappools";

const at = (p: Phase) => PHASES.indexOf(p);

/** what is not ready for the host's switch to `to`; informs only, never blocks */
export async function phaseWarnings(to: Phase): Promise<PhaseWarning[]> {
  const { phase } = await getSettings();
  if (to === phase) return [];
  if (at(to) < at(phase)) return [{ kind: "back" }];

  const fm = getFormat();
  const reaches = (p: Phase) => at(phase) < at(p) && at(p) <= at(to);
  const out: PhaseWarning[] = [];

  if (at(phase) <= at("screening") && at(to) > at("screening")) {
    const n = (await getRegistrations()).filter((r) => r.status === "pending").length;
    if (n) out.push({ kind: "pending", n });
  }

  if (!isBGCC6() && reaches("seeding")) {
    const [n, need] = [(await bwsRanking()).length, 2 * fm.teams];
    if (n < need) out.push({ kind: "players", n, need });
  }

  if (reaches("playoffs")) {
    const [teams, matches, pools] = await Promise.all([getTeams(), getMatches(), getPoolStages()]);
    if (teams.length < fm.teams) out.push({ kind: "teams", n: teams.length, need: fm.teams });
    const first = roundOf(fm.order[0]);
    const seeded = matches.filter((m) => roundOf(m.id) === first && m.team1.id && m.team2.id).length;
    if (seeded < fm.r1.length) out.push({ kind: "bracket", n: fm.r1.length - seeded });
    const pool = pools.find((s) => isBracketStage(s.slug));
    if (!pool?.released) out.push({ kind: "pool", title: pool?.title ?? null });
  }

  if (to === "finished") {
    const matches = await getMatches();
    const gf = matches.find((m) => m.id === GF);
    // the reset final only exists when the lower bracket side wins the grand final
    const done = gf?.winner === 1 || (gf?.winner === 2 && !!matches.find((m) => m.id === GF_RESET)?.winner);
    if (!done) out.push({ kind: "final" });
  }

  return out;
}
