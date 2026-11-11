import { schedNav, getMe } from "@/db/viewer";
import { declinedNote, owedPick } from "@/db/team-requests";
import { DiscordPrompt } from "./discord-prompt";
import { TeamPrompt } from "./team-prompt";
import { GatedSubNav } from "@/components/site/gated-sub-nav";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const [sched, me] = await Promise.all([schedNav().catch(() => null), getMe()]);
  const owed = me ? await owedPick(me.osuId).catch(() => null) : null;
  const declined = owed ? await declinedNote(owed.id).catch(() => null) : null;
  return (
    <>
      <GatedSubNav base="/me" />
      {children}
      {owed ? <TeamPrompt avatar={owed.players[0]?.avatar ?? ""} declined={declined} /> : sched?.discord && <DiscordPrompt />}
    </>
  );
}
