import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { Container, SectionHeading, Tag } from "@/components/site/page";
import { StitchText, SpeedLines } from "@/components/site/graphics";
import { MatchRow } from "@/components/site/match-row";
import { allMatches, teams, teamById, fmtNum, flagUrl } from "@/lib/data";

export function generateStaticParams() {
  return teams.map((t) => ({ id: t.id }));
}

export default async function TeamPage({ params }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const team = teamById(id);
  if (!team) notFound();
  const matches = allMatches.filter((m) => m.team1.id === id || m.team2.id === id);
  const wins = matches.filter((m) => (m.team1.id === id && m.winner === 1) || (m.team2.id === id && m.winner === 2)).length;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-2xl" />
        <SpeedLines className="absolute -right-10 bottom-6 h-24 w-[40rem] text-rose-hi/40" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-end gap-8 px-4 py-12 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={team.image} alt="" className="size-40 border-4 border-paper object-cover" />
          <div>
            <Tag tone="balkan" className="text-xs">Seed {team.seed}</Tag>
            <h1 className="heading-slam mt-2 max-w-3xl text-4xl sm:text-6xl">{team.name}</h1>
            <div className="mt-3 flex gap-8">
              {[
                ["Avg rank", `#${fmtNum(team.avgRank)}`],
                ["Avg pp", fmtNum(team.avgPp)],
                ["Record", `${wins}–${matches.filter((m) => m.winner).length - wins}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[0.65rem] font-black uppercase tracking-widest text-rose-hi">{k}</div>
                  <div className="num text-3xl">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <StitchText value={`SEED ${team.seed}`} className="ml-auto hidden h-10 w-auto text-paper/70 md:block" />
        </div>
      </section>

      <Container>
        <SectionHeading>Roster</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-3">
          {team.players.map((p) => (
            <div key={p.userId} className="flex border border-line bg-coal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatar} alt="" className="size-24 object-cover" />
                            <div className="flex-1 p-3">
                <div className="flex items-center gap-2 font-black">
                  {p.username}
                  {p.isCaptain && <Crown className="size-4 text-[#d4a72c]" />}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(p.country)} alt="" className="mt-1 h-3" />
                <div className="num mt-2 flex gap-4 text-sm text-paper/75">
                  <span>#{fmtNum(p.rank)}</span>
                  <span>{fmtNum(Math.round(p.pp))}pp</span>
                  <span>{p.accuracy.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <SectionHeading>Matches</SectionHeading>
        <div className="space-y-4">
          {matches.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      </Container>
    </>
  );
}
