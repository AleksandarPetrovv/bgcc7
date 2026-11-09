import "server-only";
import { poolListed } from "@/lib/authz";
import { getPoolStages } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";

export async function shownStages() {
  const [stages, skills] = await Promise.all([getPoolStages(), getSkillLayouts()]);
  const listed = await Promise.all(stages.map((s) => poolListed(s.released)));
  return stages
    .filter((s, i) => s.pools.length && listed[i])
    .map((s) => {
      const l = skills?.[s.slug];
      return { ...bySkill(s, l), info: l ? { firstTo: l.firstTo, bans: l.bans } : null };
    });
}
