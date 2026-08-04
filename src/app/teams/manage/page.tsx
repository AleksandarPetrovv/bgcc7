import { CalendarClock, Crown, Mail, Shield } from "lucide-react";
import { Container, PageTitle, SlantButton, Tag } from "@/components/site/page";
import { teams, fmtNum, flagUrl } from "@/lib/data";

export default function Manage() {
  const team = teams[4];
  return (
    <Container>
      <PageTitle right={<Tag tone="balkan" className="text-xs">You are the captain</Tag>}>Team management</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="bg-paper text-ink">
          <div className="flex items-center gap-4 bg-ink p-4 text-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.image} alt="" className="size-16 object-cover" />
            <div>
              <div className="heading-slam text-3xl">{team.name}</div>
              <div className="text-xs font-bold uppercase text-ash">Roster locks when you play your qualifier lobby</div>
            </div>
          </div>
          <ul className="divide-y divide-ink/10">
            {team.players.map((p) => (
              <li key={p.userId} className="flex items-center gap-3 px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.avatar} alt="" className="size-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(p.country)} alt="" className="h-3" />
                <span className="font-bold">{p.username}</span>
                {p.isCaptain && <Crown className="size-4 text-[#d4a72c]" />}
                <span className="num ml-auto text-ink/60">#{fmtNum(p.rank)}</span>
                {!p.isCaptain && <button className="text-xs font-black uppercase text-rose hover:underline">Remove</button>}
              </li>
            ))}
            <li className="flex items-center gap-3 px-4 py-3 text-ink/50">
              <Mail className="size-5" />
              <span className="text-sm font-bold">Invite sent to a substitute · waiting for them to accept</span>
              <button className="ml-auto text-xs font-black uppercase text-ink hover:underline">Cancel invite</button>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="border border-line bg-coal p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-balkan">
              <CalendarClock className="size-4" /> Qualifier lobby
            </div>
            <div className="num mt-2 text-4xl">Sat 28 Nov · 18:30</div>
            <p className="mt-1 text-sm text-ash">Lobby A2 · referee Raregendary</p>
            <div className="mt-4 flex gap-3">
              <SlantButton tone="paper">Change lobby</SlantButton>
            </div>
          </div>
          <div className="border border-line bg-coal p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose">
              <Shield className="size-4" /> Reschedule request
            </div>
            <p className="mt-2 text-sm text-ash">Ask the other captain for a new match time. Requests close Thursday 23:59 EET.</p>
            <div className="mt-4">
              <SlantButton tone="rose">Request reschedule</SlantButton>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
