import { GatedSubNav } from "@/components/site/gated-sub-nav";

export default async function SchedulingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GatedSubNav base="/scheduling" />
      {children}
    </>
  );
}
