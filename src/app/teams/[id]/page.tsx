import { notFound } from "next/navigation";
import { Words } from "@/components/site/rich";
import { Crown } from "lucide-react";
import { Container, SectionHeading, Tag } from "@/components/site/page";
import { MatchRow } from "@/components/site/match-row";
import { RecordText } from "@/components/site/record";
import { getDict } from "@/lib/i18n/server";
import { fmtNum, flagUrl } from "@/lib/data";
import { getMatches, getTeams } from "@/db/tournament";
import { osuUser } from "@/lib/links";
import { requireSection } from "@/lib/authz";

export default async function TeamPage({ params }: PageProps<"/teams/[id]">) {
  await requireSection("teams");
  const { id } = await params;
  const [t, teams, allMatches] = await Promise.all([getDict(), getTeams(), getMatches()]);
  const team = teams.find((x) => x.id === id);
  if (!team) notFound();
  const matches = allMatches.filter((m) => m.team1.id === id || m.team2.id === id);
  const wins = matches.filter((m) => (m.team1.id === id && m.winner === 1) || (m.team2.id === id && m.winner === 2)).length;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-25 blur-2xl" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-end gap-8 px-4 py-12 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={team.image} alt="" className="in-spin size-40 border-4 border-paper object-cover" style={{ "--d": "0.1s" } as React.CSSProperties} />
          <div>
            <span className="in-pop inline-block origin-left" style={{ "--d": "0.35s" } as React.CSSProperties}>
              <Tag tone="balkan" className="text-xs">
                {t.common.seed} {team.seed}
              </Tag>
            </span>
            <h1 className="heading-slam mt-2 max-w-3xl text-4xl sm:text-6xl">
              <Words text={team.name} d={0.4} s={0.08} />
            </h1>
            <div className="mt-3 flex gap-8">
              {(
                [
                  [t.common.avgRank, `#${fmtNum(team.avgRank)}`],
                  [t.common.avgPp, fmtNum(team.avgPp)],
                  [t.common.record, <RecordText key="record" t={t} w={wins} l={matches.filter((m) => m.winner).length - wins} />],
                ] as [string, React.ReactNode][]
              ).map(([k, v], i) => (
                <div key={k} className="in-up" style={{ "--i": i, "--s": "0.1s", "--d": "0.7s" } as React.CSSProperties}>
                  <div className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-rose-hi">{k}</div>
                  <div className="num text-3xl">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Container>
        <SectionHeading>{t.teams.roster}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {team.players.map((p) => (
            <div key={p.userId} className="flex border border-line bg-coal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatar} alt="" className="size-24 object-cover" />
              <div className="flex-1 p-3">
                <div className="flex items-center gap-2 font-black">
                  <a href={osuUser(p.userId)} target="_blank" rel="noreferrer" className="hover:text-rose-hi">
                    {p.username}
                  </a>
                  {p.isCaptain && <Crown className="size-4 text-[#d4a72c]" aria-label={t.common.captain} />}
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

        <SectionHeading>{t.teams.matches}</SectionHeading>
        <div className="space-y-4">{matches.length ? matches.map((m) => <MatchRow key={m.id} match={m} />) : <p className="text-sm text-ash">{t.teams.noMatches}</p>}</div>
      </Container>
    </>
  );
}
