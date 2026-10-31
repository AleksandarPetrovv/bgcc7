import { schedNav } from "@/db/schedule";
import { getViewer } from "@/lib/authz";
import { MeSubNav } from "../me/sub-nav";

export default async function SchedulingLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  const sched = await schedNav(v?.osuId ?? null).catch(() => null);
  return (
    <>
      <MeSubNav sched={!!sched} />
      {children}
    </>
  );
}
