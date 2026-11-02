import { pageMeta } from "@/lib/page-meta";
import { requireSection } from "@/lib/authz";
import { shownStages } from "./shown";
import { MappoolView } from "./mappool-view";

export const generateMetadata = pageMeta("mappool");

export default async function Mappool() {
  await requireSection("mappool");
  return <MappoolView stages={await shownStages()} />;
}
