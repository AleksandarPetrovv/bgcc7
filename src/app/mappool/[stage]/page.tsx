import { notFound } from "next/navigation";
import { requireSection, getVisibility } from "@/lib/authz";
import { getPoolStages } from "@/db/mappools";
import { MappoolView } from "../mappool-view";

export default async function StagePool({ params }: { params: Promise<{ stage: string }> }) {
  await requireSection("mappool");
  const [{ stage }, stages, vis] = await Promise.all([params, getPoolStages(), getVisibility()]);
  const shown = stages.filter((s) => s.pools.length && (s.released || vis.staff));
  if (!shown.some((s) => s.slug === stage)) notFound();
  return <MappoolView stages={shown} initial={stage} />;
}
