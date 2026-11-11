import { pageMeta } from "@/lib/page-meta";
import { Container, SectionHeading } from "@/components/site/page";
import { PageTitle } from "@/components/site/page-title";
import { CountUp } from "@/components/site/motion";
import { MapDifficultyChart } from "@/components/site/map-chart";
import { LinkTabs } from "@/components/site/tabs";
import { getDict } from "@/lib/i18n/server";
import { fmtNum } from "@/lib/data";
import { getQualResults } from "@/db/qualifiers";
import { getPoolStages } from "@/db/mappools";
import { getMatches, getTeams } from "@/db/tournament";
import { getStageStats } from "@/db/stage-stats";
import { scoreboardOrNull } from "@/db/scoreboards";
import { osuUser } from "@/lib/links";
import { cn } from "@/lib/utils";
import { bySkill, skillColor } from "@/lib/format-plan";
import { getSkillLayouts } from "@/db/format-plan";
import { requireSection } from "@/lib/authz";
import { InView } from "@/components/site/in-view";
import { MeTag, meP } from "@/components/site/me";
import { MEDAL, modHi } from "@/lib/theme";
import { roundName } from "@/lib/i18n/dict";
import { RuleDiamond } from "@/components/site/rule";
import { isBracketStage } from "@/lib/format";
import { outPlayerIds } from "@/lib/alive";

const TONES = ["bg-rose text-white", "bg-balkan text-on-fill", "border-b border-line", "border-b border-line"];

export const generateMetadata = pageMeta("stats");

export default async function Stats({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  await requireSection("stats");
  const [{ stage: wanted }, t, qual, stages, matches, teams, skills] = await Promise.all([searchParams, getDict(), getQualResults(), getPoolStages(), getMatches(), getTeams(), getSkillLayouts()]);
  // a stage opens once a point is won: saved score, or for a running match the map wins from its mp links
  const pts = (m: (typeof matches)[number]) => (m.team1.score ?? 0) + (m.team2.score ?? 0);
  const live = await Promise.all(
    matches
      .filter((m) => m.links.length > 0 && !pts(m))
      .map(async (m) => {
        const sb = await scoreboardOrNull(m, teams, stages);
        return sb && sb.score[0] + sb.score[1] > 0 ? m.stage : null;
      }),
  );
  const reached = (slug: string) =>
    !isBracketStage(slug) ? qual.players.some((p) => Object.keys(p.perf).length > 0) : live.includes(slug) || matches.some((m) => m.stage === slug && m.links.length > 0 && pts(m) > 0);
  const open = stages.filter((s) => reached(s.slug));
  const current = stages.find((s) => s.slug === wanted && reached(s.slug)) ?? open.at(-1);
  const name = (title: string) => roundName(t, title);

  const tabs =
    stages.length > 1 ? (
      <LinkTabs
        spark
        label={t.stats.stageTabs}
        items={stages.map((s) => ({ href: `/stats?stage=${s.slug}`, label: name(s.title), active: s.slug === current?.slug, disabled: !reached(s.slug) }))}
      />
    ) : null;

  const isQual = !!current && !isBracketStage(current.slug);
  const gone = outPlayerIds(teams);
  const data = !current ? null : isQual ? { ...qual, players: qual.players.filter((p) => !gone.has(p.id)), plays: 0, matches: 0 } : await getStageStats(bySkill(current, skills?.[current.slug]), matches, teams, stages);
  const perfs = data ? data.players.flatMap((p) => Object.entries(p.perf).map(([mid, v]) => ({ ...v, mid, player: p }))) : [];

  if (!data || !perfs.length)
    return (
      <Container plain>
        <PageTitle mark="bars" right={tabs}>
          {t.stats.title}
        </PageTitle>
        <p className="py-10 text-center text-ash">{t.qual.noResults}</p>
      </Container>
    );

  const best = perfs.reduce((a, b) => (b.score > a.score ? b : a));
  const acc = perfs.reduce((a, b) => (b.acc > a.acc ? b : a));
  const mapBy = (id: string) => data.maps.find((m) => String(m.id) === id);
  const lead = data.players[0];

  const highlights = [
    { k: t.stats.highest, n: best.score, dec: 0, suf: "", who: best.player.username, map: mapBy(best.mid) },
    { k: t.stats.bestAcc, n: acc.acc, dec: 2, suf: "%", who: acc.player.username, map: mapBy(acc.mid) },
    isQual
      ? { k: t.stats.topSeed, n: lead.zSum, dec: 2, suf: "", who: lead.username, map: undefined }
      : { k: t.stats.topCost, n: ("topCost" in data && data.topCost?.cost) || 0, dec: 2, suf: "", who: ("topCost" in data && data.topCost?.username) || "—", map: undefined },
    { k: t.stats.scoresSet, n: isQual ? perfs.length : data.plays, dec: 0, suf: "", who: t.common.players(data.players.length), map: undefined },
  ];

  return (
    <Container plain>
      <PageTitle mark="bars" right={tabs}>
        {t.stats.title}
      </PageTitle>
      <div key={current!.slug} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((h, i) => (
          <div key={h.k} className={cn("in-launch relative overflow-hidden p-5", TONES[i])} style={{ "--i": i, "--s": "0.16s", "--d": "0.2s" } as React.CSSProperties}>
            <span className="in-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0" style={{ "--d": "1.05s" } as React.CSSProperties} aria-hidden />
            <div className="in-wipe text-[0.65rem] font-display font-bold opacity-80" style={{ "--d": "0.75s" } as React.CSSProperties}>{h.k}</div>
            <CountUp to={h.n} decimals={h.dec} suffix={h.suf} delay={0.8 + i * 0.16} className="num mt-1 block text-5xl leading-none" />
            <div className="in-up mt-2 text-sm font-display font-bold" style={{ "--d": "0.95s" } as React.CSSProperties}>{h.who}</div>
            {h.map && (
              <div className="truncate text-xs opacity-80">
                {h.map.slot} · {h.map.title}
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionHeading>{t.stats.avgPerMap}</SectionHeading>
      <InView key={`c-${current!.slug}`} className="relative border-b border-line pb-6">
        <RuleDiamond />
        <MapDifficultyChart qualifiers={data} />
      </InView>

      <SectionHeading>{t.stats.mapLeaders}</SectionHeading>
      <InView key={`l-${current!.slug}`} className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2 2xl:grid-cols-3">
        {data.maps.filter((m) => data.players.some((p) => p.perf[m.id])).map((m, k) => {
          const top = data.players
            .filter((p) => p.perf[m.id])
            .sort((a, b) => b.perf[m.id].score - a.perf[m.id].score)
            .slice(0, 3);
          return (
            <div key={m.id} className={cn("flex items-stretch border-b border-line", k % 2 ? "in-right" : "in-left")} style={{ "--i": k, "--s": "0.06s" } as React.CSSProperties}>
              <div className="relative w-20 shrink-0 overflow-hidden sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.cover} alt="" className="absolute inset-0 size-full object-cover opacity-35 [mask-image:linear-gradient(to_right,black_40%,transparent)]" />
                <span className="in-pop heading-slam relative flex h-full min-h-16 items-center justify-center px-0 mx-0 -translate-x-[0.1em] text-lg sm:text-xl [text-shadow:0_0_8px_var(--ink),0_0_2px_var(--ink)]" style={{ "--d": "0.25s", color: modHi(skillColor(m.slot)) } as React.CSSProperties}>{m.slot}</span>
              </div>
              <ol className="min-w-0 flex-1 divide-y divide-line">
                {top.map((p, i) => (
                  <li key={p.id} {...meP(p.id)} className="me-hl flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className={cn("num w-5 shrink-0", MEDAL[i])}>{i + 1}</span>
                    <a href={osuUser(p.id)} target="_blank" rel="noreferrer" className="min-w-0 truncate font-display font-bold hover:text-rose-hi">{p.username}</a>
                    <MeTag p={p.id} />
                    <span className="num ml-auto shrink-0 text-base">{fmtNum(p.perf[m.id].score)}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </InView>
    </Container>
  );
}
