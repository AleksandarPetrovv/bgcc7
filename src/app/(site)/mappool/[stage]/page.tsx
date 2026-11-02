import { pageMeta } from "@/lib/page-meta";
import { notFound } from "next/navigation";
import { requireSection } from "@/lib/authz";
import { shownStages } from "../shown";
import { MappoolView } from "../mappool-view";

export const generateMetadata = pageMeta("mappool");

export default async function StagePool({ params }: { params: Promise<{ stage: string }> }) {
  await requireSection("mappool");
  const [{ stage }, shown] = await Promise.all([params, shownStages()]);
  if (!shown.some((s) => s.slug === stage)) notFound();
  return <MappoolView stages={shown} initial={stage} />;
}
