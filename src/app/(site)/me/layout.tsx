import { schedNav } from "@/db/viewer";
import { DiscordPrompt } from "./discord-prompt";
import { MeSubNav } from "./sub-nav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const sched = await schedNav().catch(() => null);
  return (
    <>
      <MeSubNav />
      {children}
      {sched?.discord && <DiscordPrompt />}
    </>
  );
}
