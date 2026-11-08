import "server-only";
import { getVisibility } from "@/lib/authz";
import { getPoolStages } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";

export const poolVisible = (released: boolean, vis: { staff: boolean; sections: { mappool: boolean } }) => vis.staff || (released && vis.sections.mappool);

export async function shownStages() {
  const [stages, vis, skills] = await Promise.all([getPoolStages(), getVisibility(), getSkillLayouts()]);
  return stages
    .filter((s) => s.pools.length && poolVisible(s.released, vis))
    .map((s) => {
      const l = skills?.[s.slug];
      return { ...bySkill(s, l), info: l ? { firstTo: l.firstTo, bans: l.bans } : null };
    });
}
