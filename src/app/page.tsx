import Link from "next/link";
import { ArrowRight, ArrowUpRight, Radio } from "lucide-react";
import { SpeedLines, Tricolor } from "@/components/site/graphics";
import { SlantButton } from "@/components/site/page";
import { Rich } from "@/components/site/rich";
import { getDict } from "@/lib/i18n/server";
import { fmtDay, roundName, type Dict } from "@/lib/i18n/dict";
import { Countdown } from "@/components/site/countdown";
import { MODS, allMatches, stages, staff, teams, timeline, teamById } from "@/lib/data";
import { cn } from "@/lib/utils";

const CURRENT = "reg";
const REG_CLOSES = "2026-11-22T23:59:00+02:00";

function HeroLockup() {
  return (
    <div className="relative select-none">
      <div className="font-display text-[clamp(4.5rem,15vw,13.5rem)] font-black lowercase leading-[0.8] tracking-[-0.05em] text-paper">
        bgcc
      </div>
      <div className="relative -mt-[0.1em] flex items-end">
        <div className="relative mb-[0.9em] mr-3 h-[clamp(2.4rem,6vw,5rem)] flex-1 text-[clamp(0.9rem,2vw,1.4rem)]">
          <SpeedLines className="absolute inset-0 h-full w-full text-paper" count={12} />
          <div className="absolute left-0 top-1/2 flex -translate-y-1/2 gap-2">
            {["bg-paper", "bg-balkan", "bg-rose"].map((c, i) => (
              <span
                key={c}
                className={cn("anim-stripe block h-[clamp(2.4rem,6vw,5rem)] w-[clamp(1.2rem,3vw,2.6rem)] -skew-x-[18deg]", c)}
                style={{ animation: `stripe-in 0.6s ${0.15 + i * 0.1}s cubic-bezier(.16,1,.3,1) both` }}
              />
            ))}
          </div>
        </div>
        <div className="pr-[0.14em] font-display text-[clamp(4.5rem,15vw,14rem)] font-black italic leading-[0.72] tracking-[-0.06em] text-rose">7</div>
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

function RosterSlots({ sub }: { sub: string }) {
  return (
    <div className="flex h-full items-center gap-2.5 px-5" aria-hidden>
      {["C", "2", "3"].map((s, i) => (
        <span
          key={s}
          className="anim-rise flex h-16 w-14 -skew-x-12 items-center justify-center bg-ink/85"
          style={{ animationDelay: `${0.2 + i * 0.08}s` }}
        >
          <span className="num skew-x-12 text-3xl text-paper">{s}</span>
        </span>
      ))}
      <span className="flex h-16 w-14 -skew-x-12 items-center justify-center border-2 border-dashed border-ink/50">
        <span className="skew-x-12 text-xs font-black uppercase text-ink/70">{sub}</span>
      </span>
    </div>
  );
}

function ModChips() {
  const maps = stages[0].pools.flatMap((p) => p.maps.map((m) => ({ slot: m.slot, color: MODS[p.category].color, light: p.category === "Tiebreaker" || p.category === "Hidden" })));
  return (
    <div className="flex h-full flex-wrap content-center gap-1.5 px-4" aria-hidden>
      {maps.map((m) => (
        <span key={m.slot} className={cn("heading-slam px-2 py-1 text-lg", m.light ? "text-ink" : "text-white")} style={{ background: m.color }}>
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
        <img key={t.id} src={t.image} alt="" className="size-full object-cover" />
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
      <rect x={196} y={38} width={46} height={19} className="fill-rose/80" />
      <path d="M182 47.5h14" className="stroke-rose" strokeWidth={1.5} strokeDasharray="3 3" />
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
              current ? "bg-balkan/10 font-black text-balkan" : i < at ? "text-ash" : "text-paper",
            )}
          >
            <span className="absolute left-0 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center bg-ink">
              {current ? (
                <span className="size-2.5 rotate-45 bg-balkan" />
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
  const t = await getDict();
  const featured = allMatches.filter((m) => m.winner).slice(0, 3);
  return (
    <>
      <section className="grain relative overflow-hidden border-b border-line">
        <div
          className="pointer-events-none absolute -right-32 -top-24 font-display text-[44rem] font-black italic leading-none text-white/[0.025]"
          aria-hidden
        >
          7
        </div>
        <div className="relative mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:pt-14">
          <div className="anim-rise">
            <HeroLockup />
          </div>

          <div className="anim-rise flex min-w-0 flex-col justify-end" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-stretch border border-paper">
              <div className="min-w-0 flex-1 px-3 py-2 font-display text-[clamp(0.95rem,2.4vw,2rem)] font-black lowercase leading-none tracking-tight sm:px-4">
                {t.home.badge}
              </div>
              <div className="flex items-center bg-paper px-2.5 font-display text-[clamp(1rem,2.4vw,2rem)] font-black italic text-rose sm:px-4">2026</div>
            </div>
            <h1 className="mt-8 text-balance text-[clamp(1.8rem,3.4vw,3.1rem)] font-black leading-[1.03] tracking-tight">
              <Rich text={t.home.headline} />
            </h1>
            <p className="mt-5 max-w-[48ch] text-pretty text-lg text-paper/80">{t.home.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <SlantButton href="/register" tone="balkan" className="px-5 py-2.5 text-base">{t.home.registerTeam}</SlantButton>
              <SlantButton href="/info" tone="outline" className="px-5 py-2.5 text-base">{t.home.readRules}</SlantButton>
            </div>
          </div>
        </div>
        <Tricolor className="h-2.5" vertical />
      </section>

      <section className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-12 px-4 pt-14 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)]">
        <div>
          <h2 className="heading-slam text-3xl">{t.home.timeline}</h2>
          <Timeline t={t} />
          <div className="mt-8 border border-balkan/50 bg-balkan/10 p-4">
            <div className="text-[0.7rem] font-black uppercase tracking-widest text-balkan">{t.home.closesIn}</div>
            <Countdown to={REG_CLOSES} />
          </div>
        </div>

        <div className="grid content-start gap-5 sm:grid-cols-2">
          <EntryCard title={t.home.registration} sub={t.home.regSub} href="/register" className="bg-rose">
            <RosterSlots sub={t.home.sub} />
          </EntryCard>
          <EntryCard title={t.home.mappool} sub={t.home.mapSub} href="/mappool" className="border border-line bg-slate">
            <ModChips />
          </EntryCard>
          <EntryCard title={t.home.teams} sub={t.home.teamsSub(teams.length, teams.length * 3)} href="/teams" className="bg-balkan">
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
          <Link href="/schedule" className="inline-flex items-center gap-1.5 text-sm font-black uppercase text-rose-hi hover:text-paper">
            {t.home.fullSchedule} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
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
                    <div key={i} className={cn("flex min-w-0 items-center gap-3", i === 1 && "order-3 flex-row-reverse text-right")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={team?.image} alt="" className={cn("size-12 shrink-0 object-cover", m.winner !== i + 1 && "opacity-50 grayscale")} />
                      <span className={cn("line-clamp-2 min-w-0 break-words text-sm leading-tight", m.winner === i + 1 ? "font-black text-paper" : "font-bold text-ash")}>{team?.name}</span>
                    </div>
                  ))}
                  <div className="order-2 -skew-x-12 bg-rose px-3 py-1.5">
                    <span className="num block skew-x-12 text-2xl text-white">
                      {m.team1.score}-{m.team2.score}
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
