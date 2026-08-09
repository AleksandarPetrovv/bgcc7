import { requireSection } from "@/lib/authz";
import { MappoolView } from "./mappool-view";

export default async function Mappool() {
  await requireSection("mappool");
  return <MappoolView />;
}
