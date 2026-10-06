import { notFound } from "next/navigation";
import { requireSection, getVisibility } from "@/lib/authz";
import { getPoolStages } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";
import { MappoolView } from "../mappool-view";

export default async function StagePool({ params }: { params: Promise<{ stage: string }> }) {
  await requireSection("mappool");
  const [{ stage }, stages, vis, skills] = await Promise.all([params, getPoolStages(), getVisibility(), getSkillLayouts()]);
  const shown = stages.filter((s) => s.pools.length && (s.released || vis.staff)).map((s) => {
    const l = skills?.[s.slug];
    return { ...bySkill(s, l), info: l ? { firstTo: l.firstTo, bans: l.bans } : null };
  });
  if (!shown.some((s) => s.slug === stage)) notFound();
  return <MappoolView stages={shown} initial={stage} />;
}
