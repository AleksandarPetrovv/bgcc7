import { notFound } from "next/navigation";
import { Words } from "@/components/site/rich";
import { Crown } from "lucide-react";
import { Container, SectionHeading, Tag } from "@/components/site/page";
import { MatchRow } from "@/components/site/match-row";
import { cardLabels, recordOf } from "@/lib/matches";
import { RecordText } from "@/components/site/record";
import { getDict } from "@/lib/i18n/server";
import { fmtNum, flagUrl, teamFromHref } from "@/lib/data";
import { getMatches, getTeams } from "@/db/tournament";
import { getPlayerSeeds } from "@/db/seeds";
import { osuUser } from "@/lib/links";
import { requireSection } from "@/lib/authz";
import { MeTag, meP } from "@/components/site/me";
import { getFormat } from "@/db/edition";

export default async function TeamPage({ params }: PageProps<"/teams/[id]">) {
  await requireSection("teams");
  const { id: raw } = await params;
  const [t, teams, allMatches, pos] = await Promise.all([getDict(), getTeams(), getMatches(), getPlayerSeeds()]);
  const team = teamFromHref(teams, raw);
  if (!team) notFound();
  const seeds = team.players.map((p) => pos.get(p.userId)).filter((s) => s !== undefined);
  const avgSeed = seeds.length ? (seeds.reduce((a, b) => a + b, 0) / seeds.length).toFixed(1).replace(/\.0$/, "") : "-";
  const id = team.id;
  const matches = allMatches.filter((m) => m.team1.id === id || m.team2.id === id);
  const [wins, losses] = recordOf(matches, id);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-25 mix-blend-multiply blur-2xl" />
        <div className="relative mx-auto flex max-w-page flex-wrap items-end gap-8 px-4 py-12 sm:px-6 lg:px-10 lg:py-16 2xl:px-14">
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
            <div className="mt-3 grid grid-cols-[repeat(3,auto)] justify-start gap-x-5 sm:flex sm:gap-8">
              {(
                [
                  [t.common.avgRank, `#${fmtNum(team.avgRank)}`],
                  [t.common.avgSeed, seeds.length ? `#${avgSeed}` : avgSeed],
                  [t.common.record, <RecordText key="record" t={t} w={wins} l={losses} />],
                ] as [string, React.ReactNode][]
              ).map(([k, v], i) => (
                <div key={k} className="in-up" style={{ "--i": i, "--s": "0.1s", "--d": "0.7s" } as React.CSSProperties}>
                  <div className="text-[0.65rem] font-display font-bold text-rose-hi">{k}</div>
                  <div className="num whitespace-nowrap text-[clamp(1.25rem,5.6vw,1.875rem)] sm:text-3xl">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Container className="xl:grid xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:items-start xl:gap-12">
        <div>
        <SectionHeading>{t.teams.roster}</SectionHeading>
        <div className={team.players.length === 2 ? "grid grid-cols-1 gap-x-8 sm:grid-cols-2 xl:grid-cols-1" : "grid grid-cols-1 gap-x-8 sm:grid-cols-3 xl:grid-cols-1"}>
          {team.players.map((p) => (
            <div key={p.userId} {...meP(p.userId)} className="me-hl relative flex items-center gap-1 overflow-hidden border-b border-line py-3">
              <MeTag p={p.userId} corner />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatar} alt="" className="size-20 shrink-0 object-cover" />
              <div className="flex-1 p-3">
                <div className="flex items-center gap-2 font-display font-black">
                  <a href={osuUser(p.userId)} target="_blank" rel="noreferrer" className="hover:text-rose-hi">
                    {p.username}
                  </a>
                  {p.isCaptain && <Crown className="size-4 text-gold-hi" aria-label={t.common.captain} />}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(p.country)} alt="" className="mt-1 h-3" />
                <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-paper/75">
                  <span>#{fmtNum(p.rank)}</span>
                  <span>{fmtNum(Math.round(p.pp))}pp</span>
                  <span>{p.accuracy.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>

        <div className="mt-14 xl:mt-0">
        <SectionHeading mark="chevrons">{t.teams.matches}</SectionHeading>
        {matches.length ? (
          <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
            {matches.map((m, n) => (
              <MatchRow key={m.id} match={m} small label={cardLabels(getFormat(), t, m)} delay={0.2 + n * 0.06} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ash">{t.teams.noMatches}</p>
        )}
        </div>
      </Container>
    </>
  );
}
