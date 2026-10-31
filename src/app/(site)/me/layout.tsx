import { schedNav } from "@/db/schedule";
import { getViewer } from "@/lib/authz";
import { DiscordPrompt } from "./discord-prompt";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  const sched = await schedNav(v?.osuId ?? null).catch(() => null);
  return (
    <>
      {children}
      {sched?.discord && <DiscordPrompt />}
    </>
  );
}
