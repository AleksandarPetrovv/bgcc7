import { CalendarClock, Crown, Mail, Shield } from "lucide-react";
import { Container, PageTitle, SlantButton, Tag } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { teams, fmtNum, flagUrl } from "@/lib/data";

export default async function Manage() {
  const t = await getDict();
  const team = teams[4];
  return (
    <Container>
      <PageTitle right={<Tag tone="balkan" className="text-xs">{t.teams.captainTag}</Tag>}>{t.teams.manageTitle}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="border border-line bg-coal">
          <div className="flex items-center gap-4 border-b border-line p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.image} alt="" className="size-16 object-cover" />
            <div className="min-w-0">
              <div className="heading-slam truncate text-3xl">{team.name}</div>
              <div className="text-xs font-bold uppercase text-ash">{t.teams.locks}</div>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {team.players.map((p) => (
              <li key={p.userId} className="flex items-center gap-3 px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.avatar} alt="" className="size-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(p.country)} alt="" className="h-3" />
                <span className="font-bold">{p.username}</span>
                {p.isCaptain && <Crown className="size-4 text-[#d4a72c]" aria-label={t.common.captain} />}
                <span className="num ml-auto text-ash">#{fmtNum(p.rank)}</span>
                {!p.isCaptain && (
                  <button type="button" className="text-xs font-black uppercase text-rose-hi hover:underline">
                    {t.teams.remove}
                  </button>
                )}
              </li>
            ))}
            <li className="flex items-center gap-3 px-4 py-3 text-ash">
              <Mail className="size-5" />
              <span className="text-sm font-bold">{t.teams.subInvited}</span>
              <button type="button" className="ml-auto text-xs font-black uppercase text-paper hover:underline">
                {t.teams.cancelInvite}
              </button>
            </li>
          </ul>
        </div>

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
