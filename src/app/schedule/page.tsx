import { requireSection } from "@/lib/authz";
import { ScheduleView } from "./schedule-view";

export default async function Schedule() {
  await requireSection("schedule");
  return <ScheduleView />;
}
