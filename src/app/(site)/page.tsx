import Link from "next/link";
import { ArrowRight, Check, Crown } from "lucide-react";
import { Sparkle } from "@/components/site/graphics";
import { SlantButton } from "@/components/site/page";
import { RuleDiamond } from "@/components/site/rule";
import { Words } from "@/components/site/rich";
import { Avatar } from "@/components/site/avatar";
import { Reveal } from "@/components/site/motion";
import { getDict } from "@/lib/i18n/server";
import { roundName, type Dict } from "@/lib/i18n/dict";
import { cardLabels, finalResult, recentResults, upcomingMatches } from "@/lib/matches";
import { phaseStates } from "@/lib/dates";
import { Timeline } from "@/components/site/timeline";
import { getFill } from "@/db/copy";
import { Countdown } from "@/components/site/countdown";
import { fmtNum, teamHref, type Match, type Team } from "@/lib/data";
import { getPoolStages, type PoolStage } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";
import { PoolPager } from "@/components/site/pool-pager";
import { getStageStats, mergeCosts, type TopCost } from "@/db/stage-stats";
import { MEDAL } from "@/lib/theme";
import { osuMap } from "@/lib/links";
import { modOn } from "@/lib/theme";
import { getMatches, getTeams } from "@/db/tournament";
import { getLang } from "@/lib/i18n/server";
import { isFuture } from "@/lib/time";
import { MatchRow } from "@/components/site/match-row";
import { RefreshWhileLive } from "./refresh-while-live";
import { LineIndex } from "@/components/site/line-index";
import { getRegistrations } from "@/db/registrations";
import { cn } from "@/lib/utils";
import { getSettings } from "@/db/settings";
import { getVisibility } from "@/lib/authz";
import { getMe, regOpen } from "@/db/viewer";
import { teamOfPlayer } from "@/lib/alive";
import { duePhase } from "@/lib/phase-prompt";
import { PhasePrompt } from "@/components/site/phase-prompt";
import { InView } from "@/components/site/in-view";
import { login } from "@/actions/auth";
import { HeroGate } from "@/components/site/hero-gate";
import { MeTag } from "@/components/site/me";
import { ShrinkWrap } from "@/components/site/shrink-wrap";
import { currentEdition, isBGCC6 } from "@/db";
import { localeOf } from "@/lib/i18n/locale";
import { MODS } from "@/lib/mods";
import { editionNumber, isBracketStage } from "@/lib/format";
import { getFormat } from "@/db/edition";

const INK: Record<string, number> = { "6": 0.15, "7": 0.22 };

function HeroLockup({ num }: { num: string }) {
  return (
    <div className="flex select-none items-end font-display font-black lowercase text-[clamp(4.5rem,15vw,12.5rem)] lg:text-[clamp(5.5rem,9.5vw,11rem)]">
      <div className="whitespace-nowrap leading-[0.8] tracking-[-0.05em] text-paper">
        {"bgcc".split("").map((c, i) => (
          <span key={i} className="anim-letter" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
            {c}
          </span>
        ))}
      </div>
      <span className="anim-slam relative ml-[0.04em] mb-[-0.06em] text-[1.45em] italic leading-[0.74] tracking-[-0.06em]" style={{ animationDelay: "0.35s", marginRight: `${INK[num] ?? 0.2}em` }}>
        <span className="anim-echo absolute left-[0.05em] top-[0.035em] pr-[0.3em] text-transparent [-webkit-text-stroke:2px_color-mix(in_srgb,var(--rose-deep)_45%,transparent)]" aria-hidden>
          {num}
        </span>
        <span className="relative -mr-[0.3em] pr-[0.3em] text-rose">{num}</span>
        <span
          className="anim-shine pointer-events-none absolute -left-[0.3em] -top-[0.3em] p-[0.3em] pr-[0.7em] bg-[linear-gradient(105deg,transparent_42%,color-mix(in_srgb,var(--white)_55%,transparent)_50%,transparent_58%)] bg-[length:300%_100%] bg-clip-text text-transparent"
          aria-hidden
        >
          {num}
        </span>
      </span>
    </div>
  );
}

function Champion({ t, team, other }: { t: Dict; team: Team; other?: Team }) {
  return (
    <Reveal className="relative mb-6 overflow-hidden border border-gold/35 bg-coal">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="size-24 shrink-0 object-cover ring-2 ring-gold/60 ring-offset-4 ring-offset-coal" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-display font-bold text-gold-hi">
            <Crown className="size-4" /> {t.home.champion}
          </div>
          <div className="heading-slam mt-1 break-words text-4xl">
            {team.name}
            <MeTag t={team.id} />
          </div>
          {other && <div className="mt-1 text-sm text-ash">{t.home.runnerUp(other.name)}</div>}
        </div>
        <div className="flex -space-x-2">
          {team.players.map((p) => (
            <Avatar key={p.userId} src={p.avatar} className="size-11" />
          ))}
        </div>
      </div>
      <Sparkle className="right-5 top-4 size-4 text-gold-hi" />
      <Sparkle className="right-12 top-10 size-2 text-paper/60" delay={0.9} />
    </Reveal>
  );
}

function TopList({ t, top, teams }: { t: Dict; top: TopCost[]; teams: Team[] }) {
  const stat = (k: string, v: string, cls?: string) => (
    <span className={cn("flex-col items-end gap-1", cls ?? "flex")}>
      <span className="num pe-[0.2em] text-lg italic leading-none text-paper/80">{v}</span>
      <span className="whitespace-nowrap text-[0.65rem] font-display font-bold text-ash">{k}</span>
    </span>
  );
  return (
    <ol>
      {top.map((p, i) => {
        const team = teamOfPlayer(teams, p.id);
        return (
          <li
            key={p.id}
            className="in-up flex items-center gap-3 border-b border-line py-3 first:pt-3 last:border-b-0 sm:gap-4"
            style={{ "--d": `${1.65 + i * 0.08}s` } as React.CSSProperties}
          >
            <span className={cn("num w-7 shrink-0 text-center text-3xl italic leading-none", MEDAL[i])}>{i + 1}</span>
            <span className="relative shrink-0">
              <Avatar src={p.avatar} className={cn("size-11", i === 0 && "ring-gold")} />
              {i === 0 && <Crown className="absolute -top-3 left-1/2 size-4 -translate-x-1/2 -rotate-12 fill-gold text-gold-hi" aria-hidden />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-display font-black leading-tight">{p.username}</span>
              {team && team.name !== p.username && (
                <Link href={teamHref(team)} className="truncate text-xs text-ash transition-colors hover:text-paper">
                  {team.name}
                </Link>
              )}
            </span>
            <span className="flex shrink-0 items-end gap-4 sm:gap-6">
              {stat(t.home.avgScore, fmtNum(Math.round(p.score)), "hidden sm:flex")}
              {stat(t.home.avgAcc, `${p.acc.toFixed(2)}%`, "hidden min-[420px]:flex")}
              {stat(t.home.maps, String(p.maps))}
              <span className="flex flex-col items-end gap-1">
                <span className={cn("num pe-[0.2em] text-2xl italic leading-none", i === 0 ? "text-paper" : "text-paper/80")}>{p.cost.toFixed(2)}</span>
                <span className="whitespace-nowrap text-[0.65rem] font-display font-bold text-ash">{t.home.matchCost}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// same pager as the pool so both tab bars line up: the whole tournament first, then each played round
function TopPerformers({ t, pages, teams }: { t: Dict; pages: { name: string; top: TopCost[] }[]; teams: Team[] }) {
  return (
    <InView>
      <div className="in-up flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3" style={{ "--d": "1.5s" } as React.CSSProperties}>
        <h2 className="heading-slam text-2xl sm:whitespace-nowrap sm:text-3xl xl:text-[clamp(1.25rem,1.65vw,1.65rem)]">{t.home.topPerformers}</h2>
        <Link href="/stats" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-display font-bold text-ash transition-colors hover:text-paper">
          {t.home.allStats} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
      <PoolPager pages={pages.map((p, i) => ({ name: p.name, color: i ? "var(--rose)" : "var(--gold)", node: <TopList t={t} top={p.top} teams={teams} /> }))} />
    </InView>
  );
}

function PoolRow({ t, stage, split }: { t: Dict; stage: Omit<PoolStage, "pools"> & { pools: (PoolStage["pools"][number] & { color?: string })[] }; split?: boolean }) {
  // skill pools carry their group colour, like the mappool page
  const groups: { name: string; color: string; maps: (PoolStage["pools"][number]["maps"][number] & { color: string })[] }[] = [];
  for (const p of stage.pools) {
    const maps = p.maps.map((m) => ({ ...m, color: p.color ?? MODS[m.mod]?.color ?? "var(--rose)" }));
    groups.push({ name: p.category, color: maps[0]?.color ?? "var(--rose)", maps });
  }
  return (
    // alone: two thirds wide and centred; next to top performers: the left half
    <InView className={cn(!split && "xl:mx-auto xl:w-2/3")}>
      <div className="in-up flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3" style={{ "--d": "1.5s" } as React.CSSProperties}>
        <h2 className="heading-slam text-2xl sm:whitespace-nowrap sm:text-3xl xl:text-[clamp(1.25rem,1.65vw,1.65rem)]">{roundName(t, stage.title)}</h2>
        <Link href={`/mappool/${stage.slug}`} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-display font-bold text-ash transition-colors hover:text-paper">
          {t.home.fullPool} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
      <PoolPager
        pages={groups.map((g) => ({
          name: g.name,
          color: g.color,
          node: (
      <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4", split && "xl:grid-cols-3 2xl:grid-cols-4")}>
        {g.maps.map((m, i) => {
          const mod = m.mod !== "Tiebreaker" ? MODS[m.mod] : undefined;
          return (
            <a
              key={m.rowId}
              href={osuMap(m.id)}
              target="_blank"
              rel="noreferrer"
              className="in-up group relative isolate flex h-24 flex-col justify-between overflow-hidden border border-line bg-coal p-3 transition-colors hover:border-[var(--c)] sm:h-28"
              style={{ "--d": `${1.6 + i * 0.03}s`, "--c": m.color } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.cover} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover opacity-40 saturate-[1.15] transition duration-500 group-hover:scale-105 group-hover:opacity-55 dark:opacity-25 dark:group-hover:opacity-40" />
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-coal via-coal/70 to-coal/10" aria-hidden />
              <span className="flex items-start justify-between gap-2">
                <span className="-skew-x-12 px-2 py-1" style={{ background: m.color }}>
                  <span className="heading-slam block skew-x-12 text-base leading-none sm:text-lg" style={{ color: modOn(m.color) }}>{m.slot}</span>
                </span>
                <span className="flex flex-col items-stretch gap-1">
                  <span className="num text-xs italic leading-none text-paper/80">{m.sr.toFixed(2)}★</span>
                  {mod && (
                    <span className="-skew-x-12 py-0.5 text-center" style={{ background: mod.color }}>
                      <span className="block skew-x-12 font-display text-[0.65rem] font-black leading-none" style={{ color: modOn(mod.color) }}>{mod.short}</span>
                    </span>
                  )}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-display font-black leading-tight">{m.title}</span>
                <span className="block truncate text-xs text-ash">[{m.version}]</span>
              </span>
            </a>
          );
        })}
      </div>
          ),
        }))}
      />
    </InView>
  );
}

export default async function Home() {
  const [t, lang, settings, vis, teams, matches, regs, stages] = await Promise.all([
    getDict(),
    getLang(),
    getSettings(),
    getVisibility(),
    getTeams(),
    getMatches(),
    getRegistrations(),
    getPoolStages(),
  ]);
  const skills = await getSkillLayouts();
  const [f, me] = await Promise.all([getFill(), getMe()]);
  const locale = localeOf(lang);
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const see = (s: keyof typeof vis.sections) => vis.sections[s];
  const phase = settings.phase;
  const due = me?.roles.includes("host") ? duePhase(settings.timeline, phase, !isBGCC6()) : null;
  const prompt = due && settings.phasePrompts[String(me!.osuId)] !== due ? due : null;
  const playing = phase === "seeding" || phase === "playoffs";
  const big = "px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-xl";
  const bigFill = "shadow-[4px_4px_0_0_var(--rose-deep)]";
  const final = finalResult(matches);
  const champ = phase === "finished" && final ? teamById(final.champion) : undefined;
  const runnerUp = champ && final ? teamById(final.runnerUp) : undefined;
  const ctaHref: Record<string, string> = { screening: "/teams/players", qualifiers: "/qualifiers", seeding: "/teams", playoffs: "/matches", finished: "/matches" };
  const ctaOk: Record<string, boolean> = { screening: see("players"), qualifiers: see("lobbies"), seeding: see("teams"), playoffs: see("schedule"), finished: see("schedule") };
  const signupOpen = regOpen(settings, vis.sections);
  const regCloses = signupOpen && isFuture(settings.regClosesAt) ? settings.regClosesAt!.toISOString() : null;
  const mine = me ? regs.find((r) => r.osuId === me.osuId) : undefined;
  const featured = recentResults(matches).slice(0, 2);
  const upcoming = upcomingMatches(matches).slice(0, 2);
  // a live match finishing moves it to previous and pulls the next one in
  const liveNow = upcoming.some((m) => m.running || (!!m.datetime && !isFuture(new Date(m.datetime))));
  // the round being played: the next match's pool when it's out, else the latest released one
  const released = stages.filter((s) => s.released && isBracketStage(s.slug) && s.pools.length);
  const cur = phase === "playoffs" && see("mappool") ? (released.find((s) => s.slug === upcoming[0]?.stage) ?? released.at(-1)) : undefined;
  const pool = cur && bySkill(cur, skills?.[cur.slug]);
  // top 3 by match cost: the whole tournament, then every round with results
  const played = cur && see("stats") ? (await Promise.all(released.map(async (s) => ({ s, costs: (await getStageStats(bySkill(s, skills?.[s.slug]), matches, teams, stages)).costs })))).filter((x) => x.costs.length) : [];
  const top = played.length ? [{ name: t.home.total, top: mergeCosts(played.map((x) => x.costs)).slice(0, 3) }, ...played.map((x) => ({ name: roundName(t, x.s.title), top: x.costs.slice(0, 3) }))] : undefined;
  const label = (m: Match) => cardLabels(getFormat(), t, m);

  return (
    <>
      {prompt && <PhasePrompt current={phase} next={prompt} />}
      <LineIndex />
      <HeroGate className="grain relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[70%] overflow-hidden [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden>
          <div className="anim-drift h-full w-[calc(100%+7.5rem)] dark:opacity-25 bg-[repeating-linear-gradient(115deg,transparent_0_52.4px,color-mix(in_srgb,var(--white)_30%,transparent)_52.4px_54.4px)]" />
        </div>
        <div
          className="anim-page-in pointer-events-none absolute right-[2%] top-1/2 -translate-y-1/2 font-display text-[clamp(20rem,42vw,40rem)] font-black italic leading-[0.8] text-rose-deep/[0.06]"
          style={{ animationDuration: "1.6s" }}
          aria-hidden
        >
          {editionNumber(currentEdition())}
        </div>
        <div className="relative mx-auto grid max-w-page grid-cols-[minmax(0,1fr)] gap-8 px-4 pb-10 pt-8 sm:gap-10 sm:px-6 sm:pb-12 sm:pt-10 lg:flex lg:items-center lg:justify-center lg:gap-[clamp(4rem,5vw,7rem)] lg:px-10 lg:pb-10 lg:pt-10 2xl:gap-20 2xl:px-14 2xl:pb-10 2xl:pt-10">
          <div className="min-w-0 lg:shrink-0">
            <HeroLockup num={editionNumber(currentEdition())} />
          </div>

          <ShrinkWrap className="flex min-w-0 flex-col justify-end lg:max-w-[36rem] 2xl:max-w-[40rem]">
            <h1 className="text-balance text-[clamp(1.7rem,2.9vw,2.6rem)] font-display font-black leading-[1.05] tracking-tight">
              <Words text={f(phase === "finished" ? t.home.headlineDone : t.home.headline)} d={0.25} s={0.045} lines />
            </h1>
            <p className="mt-4 max-w-[48ch] text-pretty text-base text-paper/70 sm:mt-5 sm:text-lg">
              <Words text={f(phase === "registration" ? t.home.intro : (t.home.introBy[phase] ?? t.home.intro))} d={0.6} s={0.014} lines />
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9 sm:gap-4" style={{ "--d": "1s", "--s": "0.08s" } as React.CSSProperties}>
              {signupOpen ? (
                <span className="in-pop inline-flex">
                  {mine && mine.status !== "denied" ? (
                    <span className="inline-flex -skew-x-12 cursor-default items-center border border-line bg-slate px-6 py-3 text-base font-display font-bold sm:px-8 sm:py-4 sm:text-xl text-ash" aria-disabled>
                      <span className="inline-flex skew-x-12 items-center gap-2">
                        <Check className="size-5" /> {mine.status === "approved" ? t.me.signedUp : t.me.signedUpPending}
                      </span>
                    </span>
                  ) : (
                    <SlantButton href="/register" tone="paper" className={big} fill={bigFill}>
                      {t.home.registerTeam} <ArrowRight className="size-5" />
                    </SlantButton>
                  )}
                </span>
              ) : playing ? (
                <span className="in-pop inline-flex">
                  {me ? (
                    <SlantButton href="/me" tone="paper" className={big} fill={bigFill}>
                      {t.home.myPage} <ArrowRight className="size-5" />
                    </SlantButton>
                  ) : (
                    <form action={login.bind(null, "/me")}>
                      <SlantButton type="submit" tone="paper" className={big} fill={bigFill}>
                        {t.home.login} <ArrowRight className="size-5" />
                      </SlantButton>
                    </form>
                  )}
                </span>
              ) : (
                ctaOk[phase] && (
                  <span className="in-pop inline-flex">
                    <SlantButton href={ctaHref[phase]} tone="paper" className={big} fill={bigFill}>
                      {t.home.cta[phase]} <ArrowRight className="size-5" />
                    </SlantButton>
                  </span>
                )
              )}
              {see("info") && (
                <span className="in-pop inline-flex" style={{ "--i": 1 } as React.CSSProperties}>
                  <SlantButton href="/info" tone="outline" className="px-5 py-3 text-sm sm:px-7 sm:py-4 sm:text-lg">{t.home.readRules}</SlantButton>
                </span>
              )}
            </div>
          </ShrinkWrap>
        </div>
      </HeroGate>

      <section className="mx-auto max-w-page px-4 pt-14 sm:px-6 lg:px-10 xl:-mb-16 2xl:px-14">
        {champ && <Champion t={t} team={champ} other={runnerUp} />}
        {/* intro after the hero: previous, then the timeline, then live / upcoming; each column is its own InView so ones below the fold on phones stay static */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)] 2xl:gap-16">
          {see("schedule") && featured.length > 0 && (
            <InView className="order-3 flex flex-col xl:order-none">
            <div className="in-up flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3" style={{ "--d": "0.6s" } as React.CSSProperties}>
              <h2 className="heading-slam whitespace-nowrap text-3xl xl:text-[clamp(1.25rem,1.65vw,1.65rem)]">{t.home.previously}</h2>
              <Link href="/matches" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-display font-bold text-ash transition-colors hover:text-paper">
                {t.home.fullSchedule} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-6 flex flex-1 flex-col gap-3">
              {featured.map((m, i) => (
                <div key={m.id} className="in-up grid flex-1" style={{ "--d": `${0.7 + i * 0.1}s` } as React.CSSProperties}>
                  <MatchRow match={m} small label={label(m)} delay={0.75 + i * 0.1} />
                </div>
              ))}
            </div>
            </InView>
          )}
          <InView className="order-1 xl:order-none xl:col-start-2">
            <div className="in-up flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3" style={{ "--d": "0.8s" } as React.CSSProperties}>
              <h2 className="heading-slam whitespace-nowrap text-3xl xl:text-[clamp(1.25rem,1.65vw,1.65rem)]">{t.home.timeline}</h2>
            </div>
            <Timeline t={t} timeline={settings.timeline} locale={locale} states={phaseStates(settings.timeline, phase)} />
            {regCloses && (
              <Reveal className="relative mt-8 border-b border-line pb-4" delay={0.2}>
                <RuleDiamond />
                <div className="text-[0.7rem] font-display font-bold text-ash">{t.home.closesIn}</div>
                <Countdown to={regCloses} from={settings.regOpensAt?.toISOString()} />
              </Reveal>
            )}
          </InView>
          {see("schedule") && upcoming.length > 0 && (
            <InView className="order-2 flex flex-col xl:order-none xl:col-start-3">
            <div className="in-up flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3" style={{ "--d": "1.3s" } as React.CSSProperties}>
              <h2 className="heading-slam whitespace-nowrap text-3xl xl:text-[clamp(1.25rem,1.65vw,1.65rem)]">{t.home.upcoming}</h2>
              <Link href="/matches" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-display font-bold text-ash transition-colors hover:text-paper">
                {t.home.fullSchedule} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-6 flex flex-1 flex-col gap-3">
              {upcoming.map((m, i) => (
                <div key={m.id} className="in-up grid flex-1" style={{ "--d": `${1.4 + i * 0.1}s` } as React.CSSProperties}>
                  <MatchRow match={m} small label={label(m)} live={m.running ? null : undefined} delay={1.45 + i * 0.1} />
                </div>
              ))}
            </div>
            </InView>
          )}
        </div>
        {pool && (
          <div className={cn("mt-16 2xl:mt-20", top && "grid grid-cols-[minmax(0,1fr)] gap-12 xl:grid-cols-2 2xl:gap-16")}>
            <PoolRow t={t} stage={pool} split={!!top} />
            {top && <TopPerformers t={t} pages={top} teams={teams} />}
          </div>
        )}
        {liveNow && <RefreshWhileLive />}
      </section>
    </>
  );
}
