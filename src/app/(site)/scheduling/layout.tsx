import { MeSubNav } from "../me/sub-nav";

export default async function SchedulingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MeSubNav sched />
      {children}
    </>
  );
}
