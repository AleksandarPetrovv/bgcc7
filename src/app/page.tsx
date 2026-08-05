import Link from "next/link";
import { ArrowRight, ArrowUpRight, Radio } from "lucide-react";
import { TriTick, Tricolor } from "@/components/site/graphics";
import { SlantButton } from "@/components/site/page";
import { Rich } from "@/components/site/rich";
import { getDict } from "@/lib/i18n/server";
import { fmtDay, roundName, type Dict } from "@/lib/i18n/dict";
import { Countdown } from "@/components/site/countdown";
import { MODS, allMatches, stages, staff, teams, timeline, teamById } from "@/lib/data";
import { cn } from "@/lib/utils";
import { getSignupCount } from "@/db/queries";

const CURRENT = "reg";
const REG_CLOSES = "2026-11-22T23:59:00+02:00";

function HeroLockup({ label }: { label: string }) {
  return (
    <div className="inline-block select-none font-display font-black lowercase text-[clamp(4.5rem,14vw,12.5rem)] lg:text-[clamp(6rem,10vw,11.5rem)]">
      <div className="whitespace-nowrap leading-[0.8] tracking-[-0.05em] text-paper">bgcc</div>
      <div className="mt-[0.05em] flex items-end justify-between gap-4">
        <div className="mb-[0.12em] flex min-w-0 flex-col gap-2 font-sans text-[clamp(0.6rem,1vw,0.75rem)] font-black uppercase leading-snug tracking-[0.2em] text-ash">
          <TriTick className="h-3 w-[22px]" />
          <span className="max-w-[26ch]">{label}</span>
        </div>
        <span className="relative mr-[0.02em] text-[1.45em] italic leading-[0.74] tracking-[-0.06em]">
          <span className="absolute left-[0.05em] top-[0.035em] text-transparent [-webkit-text-stroke:2px_rgba(244,243,238,0.35)]" aria-hidden>
            7
          </span>
          <span className="relative text-rose">7</span>
        </span>
      </div>
    </div>
  );
}

function EntryCard({
  title,
  sub,
  href,
  className,
  children,
}: {
  title: string;
  sub: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn("group relative flex h-44 flex-col overflow-hidden", className)}>
      <div className="relative min-h-0 flex-1 overflow-hidden transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]">
        {children}
      </div>
      <span className="relative flex items-center justify-between gap-3 bg-ink px-4 py-3 text-paper">
        <span className="min-w-0">
          <span className="block text-base font-black uppercase leading-tight">{title}</span>
          <span className="block truncate text-sm text-paper/75">{sub}</span>
        </span>
        <ArrowUpRight className="size-5 shrink-0 text-paper/70 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-paper" />
      </span>
    </Link>
  );
}

function SignupCount({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex h-full items-end gap-3 px-5 pb-4" aria-hidden>
      <span className="num text-7xl leading-[0.8] text-paper">{n}</span>
      <span className="pb-1 text-sm font-bold uppercase text-ash">{label}</span>
    </div>
  );
}

function ModChips() {
  const maps = stages[0].pools.flatMap((p) => p.maps.map((m) => ({ slot: m.slot, color: MODS[p.category].color })));
  return (
    <div className="flex h-full flex-wrap content-center gap-1.5 px-4" aria-hidden>
      {maps.map((m) => (
        <span key={m.slot} className="heading-slam border-l-[3px] bg-slate px-2 py-1 text-lg text-paper/85" style={{ borderColor: m.color }}>
          {m.slot}
        </span>
      ))}
    </div>
  );
}

function TeamMosaic() {
  return (
    <div className="grid h-full grid-cols-4 grid-rows-2" aria-hidden>
      {teams.slice(0, 8).map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={t.id} src={t.image} alt="" className="size-full object-cover opacity-80 grayscale-[.7] transition duration-500 group-hover:opacity-100 group-hover:grayscale-0" />
      ))}
    </div>
  );
}

function MiniBracket() {
  const col = (x: number, n: number, gap: number, top: number) =>
    Array.from({ length: n }, (_, i) => <rect key={`${x}-${i}`} x={x} y={top + i * gap} width={46} height={9} />);
  return (
    <svg viewBox="0 0 250 104" className="h-full w-full p-3" aria-hidden>
      <g className="fill-slate">{[...col(0, 4, 26, 4), ...col(68, 2, 52, 17), ...col(136, 1, 0, 43)]}</g>
      <g className="stroke-line" fill="none" strokeWidth={1.5}>
        <path d="M46 8.5h11v26H46M57 21.5h11M46 60.5h11v26H46M57 73.5h11M114 21.5h11v52h-11M125 47.5h11" />
      </g>
      <rect x={196} y={38} width={46} height={19} className="fill-paper/80" />
      <path d="M182 47.5h14" className="stroke-paper/60" strokeWidth={1.5} strokeDasharray="3 3" />
    </svg>
  );
}

function Timeline({ t }: { t: Dict }) {
  const at = timeline.findIndex((e) => e.key === CURRENT);
  return (
    <ol className="relative mt-6">
      <span className="anim-stitch absolute bottom-3 left-[7px] top-3 border-l-2 border-dashed border-line" aria-hidden />
      {timeline.map((e, i) => {
        const current = i === at;
        return (
          <li
            key={e.key}
            className={cn(
              "relative flex items-baseline gap-4 py-2 pl-8 pr-3 text-[0.95rem] uppercase",
              current ? "bg-slate font-black text-paper" : i < at ? "text-ash" : "text-paper/80",
            )}
          >
            <span className="absolute left-0 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center bg-ink">
              {current ? (
                <span className="size-2.5 rotate-45 bg-rose" />
              ) : (
                <span className={cn("size-2 rotate-45", i < at ? "bg-ash" : "border border-paper/60")} />
              )}
            </span>
            <span className="flex-1">{t.timeline[e.key]}</span>
            <span className="num whitespace-nowrap text-base normal-case">{fmtDay(t, e.dates)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function Home() {
  const [t, signups] = await Promise.all([getDict(), getSignupCount()]);
  const featured = allMatches.filter((m) => m.winner).slice(0, 3);
  return (
    <>
      <section className="grain relative overflow-hidden border-b border-line">
        <div
          className="pointer-events-none absolute right-[2%] top-1/2 -translate-y-1/2 font-display text-[clamp(20rem,42vw,40rem)] font-black italic leading-[0.8] text-white/[0.03]"
          aria-hidden
        >
          7
        </div>
        <div className="relative mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:pb-16 lg:pt-16">
          <div className="anim-rise min-w-0">
            <HeroLockup label={`${t.home.badge} · 2026`} />
          </div>

          <div className="anim-rise flex min-w-0 flex-col justify-end" style={{ animationDelay: "0.15s" }}>
            <h1 className="text-balance text-[clamp(1.8rem,3.2vw,2.9rem)] font-black leading-[1.05] tracking-tight">
              <Rich text={t.home.headline} />
            </h1>
            <p className="mt-5 max-w-[48ch] text-pretty text-lg text-paper/70">{t.home.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SlantButton href="/register" tone="paper" className="px-5 py-2.5 text-base">{t.home.registerTeam}</SlantButton>
              <SlantButton href="/info" tone="outline" className="px-5 py-2.5 text-base">{t.home.readRules}</SlantButton>
            </div>
          </div>
        </div>
        <dl className="relative mx-auto grid max-w-[1400px] grid-cols-2 border-t border-line sm:grid-cols-4">
          {[1, 6, 7, 8].map((i, k) => (
            <div key={i} className={cn("px-4 py-4 sm:px-6", k % 2 === 1 && "border-l border-line", k > 1 && "border-t border-line sm:border-t-0", k === 2 && "sm:border-l")}>
              <dt className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-ash">{t.info.facts[i][0]}</dt>
              <dd className="num mt-1 text-xl text-paper sm:text-2xl">{t.info.facts[i][1]}</dd>
            </div>
          ))}
        </dl>
        <Tricolor className="h-1" vertical />
      </section>

      <section className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-12 px-4 pt-14 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)]">
        <div>
          <h2 className="heading-slam text-3xl">{t.home.timeline}</h2>
          <Timeline t={t} />
          <div className="mt-8 border border-line bg-coal p-4">
            <div className="text-[0.7rem] font-black uppercase tracking-widest text-ash">{t.home.closesIn}</div>
            <Countdown to={REG_CLOSES} />
          </div>
        </div>

        <div className="grid grid-cols-1 content-start gap-5 sm:grid-cols-2">
          <EntryCard title={t.home.registration} sub={t.home.regSub} href="/register" className="border border-line bg-coal">
            <SignupCount n={signups} label={t.home.signups(signups)} />
          </EntryCard>
          <EntryCard title={t.home.mappool} sub={t.home.mapSub} href="/mappool" className="border border-line bg-slate">
            <ModChips />
          </EntryCard>
          <EntryCard title={t.home.teams} sub={t.home.teamsSub(teams.length, teams.length * 3)} href="/teams" className="border border-line bg-coal">
            <TeamMosaic />
          </EntryCard>
          <EntryCard title={t.home.bracket} sub={t.home.bracketSub} href="/schedule/bracket" className="border border-line bg-coal">
            <MiniBracket />
          </EntryCard>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line pt-5 sm:col-span-2">
            <span className="text-xs font-black uppercase tracking-widest text-ash">{t.home.backedBy}</span>
            {staff.sponsors.map((s) => (
              <div key={s.username} className="flex items-center gap-2.5 opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.avatar} alt="" className="size-8" />
                <span className="font-display text-base font-bold lowercase">{s.username}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 pt-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <h2 className="heading-slam text-4xl">{t.home.previously}</h2>
          <Link href="/schedule" className="inline-flex items-center gap-1.5 text-sm font-black uppercase text-ash hover:text-paper">
            {t.home.fullSchedule} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {featured.map((m) => {
            const a = teamById(m.team1.id);
            const b = teamById(m.team2.id);
            return (
              <div key={m.id} className="border border-line bg-coal">
                <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs font-black uppercase text-ash">
                  <span className="text-rose-hi">{roundName(t, m.round)}</span>
                  <span className="num text-sm">{m.datetime}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
                  {[a, b].map((team, i) => (
                    <div key={i} className={cn("flex min-w-0 flex-col items-start gap-2", i === 1 && "order-3 items-end text-right")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={team?.image} alt="" className={cn("size-12 shrink-0 object-cover", m.winner !== i + 1 && "opacity-50 grayscale")} />
                      <span className={cn("line-clamp-2 max-w-full break-words text-sm leading-tight", m.winner === i + 1 ? "font-black text-paper" : "font-bold text-ash")}>{team?.name}</span>
                    </div>
                  ))}
                  <div className="order-2 -skew-x-12 border border-line bg-slate px-3 py-1.5">
                    <span className="num block skew-x-12 text-2xl text-paper">
                      {m.team1.score ?? 0}-{m.team2.score ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 border border-line bg-coal p-5 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 bg-slate px-2 py-1 text-xs font-black uppercase text-ash">
            <Radio className="size-3.5" /> {t.home.offline}
          </span>
          <p className="text-sm text-paper/75">{t.home.streamNote}</p>
          <SlantButton href="/streams" tone="paper" className="sm:ml-auto">{t.home.streamSchedule}</SlantButton>
        </div>
      </section>
    </>
  );
}
