import { requireSection } from "@/lib/authz";
import { ScheduleView } from "./schedule-view";
import { getSettings } from "@/db/settings";

export default async function Schedule() {
  await requireSection("schedule");
  const settings = await getSettings();
  return <ScheduleView sheets={settings.links.sheets} />;
}
