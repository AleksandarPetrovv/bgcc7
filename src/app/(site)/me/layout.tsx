import { schedNav } from "@/db/viewer";
import { DiscordPrompt } from "./discord-prompt";
import { GatedSubNav } from "@/components/site/gated-sub-nav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const sched = await schedNav().catch(() => null);
  return (
    <>
      <GatedSubNav base="/me" />
      {children}
      {sched?.discord && <DiscordPrompt />}
    </>
  );
}
