import { schedNav } from "@/db/schedule";
import { getViewer } from "@/lib/authz";
import { DiscordPrompt } from "./discord-prompt";
import { MeSubNav } from "./sub-nav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  const sched = await schedNav(v?.osuId ?? null).catch(() => null);
  return (
    <>
      <MeSubNav sched={!!sched} />
      {children}
      {sched?.discord && <DiscordPrompt />}
    </>
  );
}
