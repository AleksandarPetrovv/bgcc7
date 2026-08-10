import { requireSection, getVisibility } from "@/lib/authz";
import { getPoolStages } from "@/db/mappools";
import { getSettings } from "@/db/settings";
import { MappoolView } from "./mappool-view";

export default async function Mappool() {
  await requireSection("mappool");
  const [stages, vis, settings] = await Promise.all([getPoolStages(), getVisibility(), getSettings()]);
  const shown = stages.filter((s) => s.pools.length && (s.released || vis.staff));
  return <MappoolView stages={shown} links={settings.links} />;
}
