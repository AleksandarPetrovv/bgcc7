import { requireSection, getVisibility } from "@/lib/authz";
import { getPoolStages } from "@/db/mappools";
import { MappoolView } from "./mappool-view";

export default async function Mappool() {
  await requireSection("mappool");
  const [stages, vis] = await Promise.all([getPoolStages(), getVisibility()]);
  const shown = stages.filter((s) => s.pools.length && (s.released || vis.staff));
  return <MappoolView stages={shown} />;
}
