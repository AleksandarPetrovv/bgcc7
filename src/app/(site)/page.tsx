import Link from "next/link";
import { ArrowRight, Check, Crown } from "lucide-react";
import { Sparkle } from "@/components/site/graphics";
import { SlantButton } from "@/components/site/page";
import { Words } from "@/components/site/rich";
import { Avatar } from "@/components/site/avatar";
import { Reveal } from "@/components/site/motion";
import { getDict } from "@/lib/i18n/server";
import { roundName, type Dict } from "@/lib/i18n/dict";
import { shortRound } from "@/lib/matches";
import { fmtRange, phaseStates, type TimelineRow } from "@/lib/dates";
import { getFill } from "@/db/copy";
import { Countdown } from "@/components/site/countdown";
import { type Match, type Team } from "@/lib/data";
import { getMatches, getTeams } from "@/db/tournament";
import { getLang } from "@/lib/i18n/server";
import { isFuture, windowState } from "@/lib/time";
import { MatchRow } from "@/components/site/match-row";
import { RefreshWhileLive } from "./refresh-while-live";
import { LineIndex } from "@/components/site/line-index";
import { getRegistrations } from "@/db/registrations";
import { cn } from "@/lib/utils";
import { getSettings } from "@/db/settings";
import { getViewer, getVisibility } from "@/lib/authz";
import { duePhase } from "@/lib/phase-prompt";
import { PhasePrompt } from "@/components/site/phase-prompt";
import { InView } from "@/components/site/in-view";
import { currentOsuId } from "@/auth";
import { login } from "@/app/(site)/pickems/actions";
import { HeroGate } from "@/components/site/hero-gate";
import { MeTag } from "@/components/site/me";
import { getEdition } from "@/db/edition";
import { ShrinkWrap } from "@/components/site/shrink-wrap";
import { isBGCC6 } from "@/db";

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

function Timeline({ t, timeline, locale, states }: { t: Dict; timeline: TimelineRow[]; locale: string; states: ReturnType<typeof phaseStates> }) {
  return (
    <InView as="ol" className="relative mt-6">
      <span className="absolute bottom-3 left-0 top-3 flex w-4 justify-center" aria-hidden><span className="anim-stitch border-l-2 border-dashed border-line" /></span>
      {timeline.map((e, i) => {
        const current = states[i] === "now";
        const done = states[i] === "done";
        return (
          <li
            key={e.key}
            className={cn(
              "in-left relative flex items-baseline gap-4 py-2 pl-8 pr-3 font-display font-bold text-[0.95rem] transition-colors",
              current ? "bg-slate font-black text-paper" : done ? "text-ash" : "text-paper/80 hover:text-paper",
            )}
            style={{ "--d": "0.85s", "--i": i, "--s": "0.08s" } as React.CSSProperties}
          >
            <span className="in-pop absolute left-0 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center" style={{ "--d": "1s", "--i": i, "--s": "0.08s" } as React.CSSProperties}>
              {current ? (
                <>
                  <span className="anim-ping-diamond absolute size-2.5 bg-rose" aria-hidden />
                  <span className="size-2.5 rotate-45 bg-rose" />
                </>
              ) : (
                <span className={cn("size-2 rotate-45", done ? "bg-ash" : "border border-paper/60 bg-ink")} />
              )}
            </span>
            <span className="flex-1">{t.timeline[e.key]}</span>
            <span className="in-wipe num whitespace-nowrap text-base normal-case" style={{ "--d": "1.1s", "--i": i, "--s": "0.08s" } as React.CSSProperties}>{fmtRange(locale, e.from, e.to)}</span>
          </li>
        );
      })}
    </InView>
  );
}

export default async function Home() {
  const [t, lang, settings, vis, teams, matches, regs] = await Promise.all([
    getDict(),
    getLang(),
    getSettings(),
    getVisibility(),
    getTeams(),
    getMatches(),
    getRegistrations(),
  ]);
  const [f, me, viewer] = await Promise.all([getFill(), currentOsuId(), getViewer()]);
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const see = (s: keyof typeof vis.sections) => vis.sections[s];
  const phase = settings.phase;
  const due = viewer?.roles.includes("host") ? duePhase(settings.timeline, phase, !isBGCC6()) : null;
  const prompt = due && settings.phasePrompts[String(viewer!.osuId)] !== due ? due : null;
  const playing = phase === "seeding" || phase === "playoffs";
  const big = "px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-xl";
  const bigFill = "shadow-[4px_4px_0_0_var(--rose-deep)]";
  const byId = new Map(matches.map((m) => [m.id, m]));
  const gf1 = byId.get("grand-final");
  const gf2 = byId.get("grand-final-reset");
  const champSide = gf2?.winner ? gf2 : gf1?.winner === 1 ? gf1 : null;
  const champ = phase === "finished" && champSide ? teamById(champSide.winner === 1 ? champSide.team1.id : champSide.team2.id) : undefined;
  const runnerUp = champ && champSide ? teamById(champSide.winner === 1 ? champSide.team2.id : champSide.team1.id) : undefined;
  const ctaHref: Record<string, string> = { screening: "/teams/players", qualifiers: "/qualifiers", seeding: "/teams", playoffs: "/matches", finished: "/matches" };
  const ctaOk: Record<string, boolean> = { screening: see("players"), qualifiers: see("lobbies"), seeding: see("teams"), playoffs: see("schedule"), finished: see("schedule") };
  const regState = windowState(settings.regOpensAt, settings.regClosesAt);
  const regCloses = phase === "registration" && see("register") && regState === "open" && isFuture(settings.regClosesAt) ? settings.regClosesAt!.toISOString() : null;
  const mine = me ? regs.find((r) => r.osuId === me) : undefined;
  const featured = matches
    .filter((m) => m.winner)
    .sort((a, b) => (b.datetime ?? "").localeCompare(a.datetime ?? ""))
    .slice(0, 2);
  // soonest scheduled first, then unscheduled ones with both teams, one team, none
  const pending = matches.filter((m) => !m.winner);
  const sides = (m: Match) => +!!m.team1.id + +!!m.team2.id;
  const upcoming = [
    ...pending.filter((m) => m.datetime).sort((a, b) => a.datetime!.localeCompare(b.datetime!)),
    ...[2, 1, 0].flatMap((n) => pending.filter((m) => !m.datetime && sides(m) === n)),
  ].slice(0, 2);
  // a live match finishing moves it to previous and pulls the next one in
  const liveNow = upcoming.some((m) => m.running || (!!m.datetime && !isFuture(new Date(m.datetime))));
  // full and short round labels; the card shows the short one when the full one doesn't fit
  const label = (m: Match): [string, string] => {
    if (m.id === "grand-final") return [t.home.grandFinal, "GF"];
    if (m.id === "grand-final-reset") return [t.home.gfReset, "GF Reset"];
    const same = matches.filter((o) => o.round === m.round);
    const n = same.length > 1 ? ` ${t.nav.match} ${same.indexOf(m) + 1}` : "";
    return [roundName(t, m.round) + n, shortRound(m.round) + n];
  };

  return (
    <>
      {prompt && <PhasePrompt current={phase} next={prompt} />}
      <LineIndex />
      <HeroGate className="grain relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[70%] overflow-hidden [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden>
          <div className="anim-drift h-full w-[calc(100%+120px)] dark:opacity-25 bg-[repeating-linear-gradient(115deg,transparent_0_52.4px,color-mix(in_srgb,var(--white)_30%,transparent)_52.4px_54.4px)]" />
        </div>
        <div
          className="anim-page-in pointer-events-none absolute right-[2%] top-1/2 -translate-y-1/2 font-display text-[clamp(20rem,42vw,40rem)] font-black italic leading-[0.8] text-rose-deep/[0.06]"
          style={{ animationDuration: "1.6s" }}
          aria-hidden
        >
          {getEdition().slice(4)}
        </div>
        <div className="relative mx-auto grid max-w-page grid-cols-[minmax(0,1fr)] gap-8 px-4 pb-10 pt-8 sm:gap-10 sm:px-6 sm:pb-12 sm:pt-10 lg:flex lg:items-center lg:justify-center lg:gap-[clamp(4rem,5vw,7rem)] lg:px-10 lg:pb-10 lg:pt-10 2xl:gap-20 2xl:px-14 2xl:pb-10 2xl:pt-10">
          <div className="min-w-0 lg:shrink-0">
            <HeroLockup num={getEdition().slice(4)} />
          </div>

          <ShrinkWrap className="flex min-w-0 flex-col justify-end lg:max-w-[36rem] 2xl:max-w-[40rem]">
            <h1 className="text-balance text-[clamp(1.7rem,2.9vw,2.6rem)] font-display font-black leading-[1.05] tracking-tight">
              <Words text={f(phase === "finished" ? t.home.headlineDone : t.home.headline)} d={0.25} s={0.045} lines />
            </h1>
            <p className="mt-4 max-w-[48ch] text-pretty text-base text-paper/70 sm:mt-5 sm:text-lg">
              <Words text={f(phase === "registration" ? t.home.intro : (t.home.introBy[phase] ?? t.home.intro))} d={0.6} s={0.014} lines />
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9 sm:gap-4" style={{ "--d": "1s", "--s": "0.08s" } as React.CSSProperties}>
              {phase === "registration" && see("register") && regState === "open" ? (
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
            <div className="in-up flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3 xl:flex-nowrap" style={{ "--d": "0.6s" } as React.CSSProperties}>
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
            <div className="in-up flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3 xl:flex-nowrap" style={{ "--d": "0.8s" } as React.CSSProperties}>
              <h2 className="heading-slam whitespace-nowrap text-3xl xl:text-[clamp(1.25rem,1.65vw,1.65rem)]">{t.home.timeline}</h2>
            </div>
            <Timeline t={t} timeline={settings.timeline} locale={locale} states={phaseStates(settings.timeline, phase)} />
            {regCloses && (
              <Reveal className="relative mt-8 overflow-hidden border border-line bg-coal p-4" delay={0.2}>
                <div className="text-[0.7rem] font-display font-bold text-ash">{t.home.closesIn}</div>
                <Countdown to={regCloses} from={settings.regOpensAt?.toISOString()} />
              </Reveal>
            )}
          </InView>
          {see("schedule") && upcoming.length > 0 && (
            <InView className="order-2 flex flex-col xl:order-none xl:col-start-3">
            <div className="in-up flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3 xl:flex-nowrap" style={{ "--d": "1.3s" } as React.CSSProperties}>
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
        {liveNow && <RefreshWhileLive />}
      </section>
    </>
  );
}
