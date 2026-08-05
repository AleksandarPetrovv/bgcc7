import { CalendarClock, Shield } from "lucide-react";
import { Container, PageTitle, SlantButton, Tag } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { ManageRoster } from "@/components/site/manage-roster";
import { teams } from "@/lib/data";

export default async function Manage() {
  const t = await getDict();
  const team = teams[4];
  return (
    <Container>
      <PageTitle right={<Tag tone="balkan" className="text-xs">{t.teams.captainTag}</Tag>}>{t.teams.manageTitle}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <ManageRoster team={team} />

        <div className="space-y-4">
          <div className="border border-line bg-coal p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-balkan">
              <CalendarClock className="size-4" /> {t.teams.lobbyTitle}
            </div>
            <div className="num mt-2 text-4xl">{t.teams.lobbyWhen}</div>
            <p className="mt-1 text-sm text-ash">{t.teams.lobbyWhere("Raregendary")}</p>
            <div className="mt-4">
              <SlantButton tone="paper">{t.teams.changeLobby}</SlantButton>
            </div>
          </div>
          <div className="border border-line bg-coal p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-hi">
              <Shield className="size-4" /> {t.teams.reschedTitle}
            </div>
            <p className="mt-2 text-sm text-ash">{t.teams.reschedText}</p>
            <div className="mt-4">
              <SlantButton tone="rose">{t.teams.reschedBtn}</SlantButton>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
