import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { schedNav } from "@/db/schedule";
import { Container } from "@/components/site/page";
import { getViewer } from "@/lib/authz";
import { discordReady } from "@/lib/discord";
import { DiscordLine, DiscordPrompt } from "./discord-prompt";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  const sched = await schedNav(v?.osuId ?? null).catch(() => null);
  const linked =
    sched && !sched.discord && discordReady() && v
      ? await db
          .select({ id: users.discordId, name: users.discordName })
          .from(users)
          .where(eq(users.osuId, v.osuId))
          .limit(1)
          .then((r) => (r[0]?.id ? (r[0].name ?? r[0].id) : null))
          .catch(() => null)
      : null;
  return (
    <>
      {children}
      {sched && discordReady() && (
        <Container plain className="pb-10 pt-0">
          <DiscordLine name={linked} />
        </Container>
      )}
      {sched?.discord && <DiscordPrompt />}
    </>
  );
}
