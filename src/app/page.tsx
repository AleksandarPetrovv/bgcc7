import Link from "next/link";
import { ArrowRight, ArrowUpRight, Radio } from "lucide-react";
import { Sparkle, TriTick, Tricolor } from "@/components/site/graphics";
import { SlantButton } from "@/components/site/page";
import { Rich } from "@/components/site/rich";
import { Avatar } from "@/components/site/avatar";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/site/motion";
import { getDict } from "@/lib/i18n/server";
import { roundName, type Dict } from "@/lib/i18n/dict";
import { fmtRange, timelineStates, type TimelineRow } from "@/lib/dates";
import { getFill } from "@/db/copy";
import { Countdown } from "@/components/site/countdown";
import { MODS, type Stage, type Team } from "@/lib/data";
import { getMatches, getSponsors, getTeams } from "@/db/tournament";
import { getLang } from "@/lib/i18n/server";
import { fmtSofia, fmtSofiaTime, isFuture, windowState } from "@/lib/time";
import { getLive } from "@/lib/twitch";
import { getPoolStages } from "@/db/mappools";
import { getRegistrations } from "@/db/registrations";
import { getLobbies, type Lobby } from "@/db/lobbies";
import { getPublicStaff } from "@/db/admin";
import { cn } from "@/lib/utils";
import { getSettings } from "@/db/settings";
import { getVisibility } from "@/lib/authz";

function HeroLockup({ label }: { label: string }) {
  return (
    <div className="inline-block select-none font-display font-black lowercase text-[clamp(4.5rem,14vw,12.5rem)] lg:text-[clamp(6rem,10vw,11.5rem)]">
      <div className="whitespace-nowrap leading-[0.8] tracking-[-0.05em] text-paper">
        {"bgcc".split("").map((c, i) => (
          <span key={i} className="anim-letter" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
            {c}
          </span>
        ))}
      </div>
      <div className="mt-[0.05em] flex items-end justify-between gap-4">
        <div className="anim-rise mb-[0.12em] flex min-w-0 flex-col gap-2 font-sans text-[clamp(0.6rem,1vw,0.75rem)] font-black uppercase leading-snug tracking-[0.2em] text-ash" style={{ animationDelay: "0.6s" }}>
          <TriTick className="h-3 w-[22px]" />
          <span className="max-w-[26ch]">{label}</span>
        </div>
        <span className="anim-slam relative mr-[0.02em] text-[1.45em] italic leading-[0.74] tracking-[-0.06em]" style={{ animationDelay: "0.35s" }}>
          <span className="anim-echo absolute left-[0.05em] top-[0.035em] text-transparent [-webkit-text-stroke:2px_rgba(244,243,238,0.35)]" aria-hidden>
            7
          </span>
          <span className="relative text-rose">7</span>
          <span
            className="anim-shine pointer-events-none absolute left-0 top-0 bg-[linear-gradient(105deg,transparent_42%,rgba(255,255,255,0.55)_50%,transparent_58%)] bg-[length:300%_100%] bg-clip-text text-transparent"
            aria-hidden
          >
            7
          </span>
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
    <Link href={href} className={cn("lift group relative flex h-44 flex-col overflow-hidden border border-line hover:border-paper/30", className)}>
      <div className="relative min-h-0 flex-1 overflow-hidden transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]">
        {children}
      </div>
      <span className="relative flex items-center justify-between gap-3 bg-ink px-4 py-3 text-paper">
        <span className="min-w-0">
          <span className="block text-base font-black uppercase leading-tight">{title}</span>
          <span className="block truncate text-sm text-paper/75">{sub}</span>
        </span>
        <ArrowUpRight className="size-5 shrink-0 text-paper/70 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:rotate-12 group-hover:text-rose-hi" />
      </span>
    </Link>
  );
}

function SignupCount({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex h-full items-end gap-3 px-5 pb-4" aria-hidden>
      <CountUp to={n} className="num text-7xl leading-[0.8] text-paper" />
      <span className="pb-1 text-sm font-bold uppercase text-ash">{label}</span>
    </div>
  );
}

function ModChips({ stage }: { stage: Stage }) {
  const maps = stage.pools.flatMap((p) => p.maps.map((m) => ({ slot: m.slot, color: MODS[p.category].color })));
  return (
    <div className="flex h-full flex-wrap content-center gap-1.5 px-4" aria-hidden>
      {maps.map((m, i) => (
        <span
          key={m.slot}
          className="anim-rise heading-slam border-l-[3px] bg-slate px-2 py-1 text-lg text-paper/85 transition-colors group-hover:text-paper"
          style={{ borderColor: m.color, animationDelay: `${0.3 + i * 0.03}s` }}
        >
          {m.slot}
        </span>
      ))}
    </div>
  );
}

function TeamMosaic({ teams }: { teams: Team[] }) {
  return (
    <div className="grid h-full grid-cols-4 grid-rows-2" aria-hidden>
      {teams.slice(0, 8).map((t, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.id}
          src={t.image}
          alt=""
          className="size-full object-cover opacity-80 grayscale-[.7] transition duration-500 group-hover:opacity-100 group-hover:grayscale-0"
          style={{ transitionDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}

function AvatarCloud({ people }: { people: { id: number; avatar: string | null }[] }) {
  return (
    <div className="flex h-full flex-wrap content-center items-center gap-2.5 px-5" aria-hidden>
      {people.slice(0, 14).map((p, i) => (
        <span key={p.id} className="anim-rise transition-transform duration-300 group-hover:-translate-y-0.5" style={{ animationDelay: `${0.25 + i * 0.04}s`, transitionDelay: `${i * 25}ms` }}>
          <Avatar src={p.avatar} className="size-9" />
        </span>
      ))}
    </div>
  );
}

function LobbySlots({ lobbies }: { lobbies: Lobby[] }) {
  return (
    <div className="flex h-full flex-wrap content-center gap-2 px-4" aria-hidden>
      {lobbies.slice(0, 8).map((l, i) => {
        const fill = Math.min(1, l.players.length / l.capacity);
        return (
          <span key={l.id} className="anim-rise relative -skew-x-12 overflow-hidden border border-line bg-slate px-3 py-1.5" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
            <span className="absolute inset-y-0 left-0 bg-rose/25 transition-[width] duration-700" style={{ width: `${fill * 100}%` }} />
            <span className="num relative block skew-x-12 text-lg text-paper">{fmtSofiaTime(l.startsAt)}</span>
          </span>
        );
      })}
    </div>
  );
}

function FormatBadge({ tags }: { tags: readonly string[] }) {
  return (
    <div className="relative flex h-full items-center gap-5 px-5" aria-hidden>
      <span className="heading-slam text-7xl leading-none text-paper transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105">
        3<span className="text-rose">v</span>3
      </span>
      <span className="flex flex-col gap-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-ash">
        {tags.map((x) => (
          <span key={x}>{x}</span>
        ))}
      </span>
      <Sparkle className="right-6 top-5 size-4 text-rose-hi" />
      <Sparkle className="right-12 top-12 size-2 text-balkan" delay={1.1} />
    </div>
  );
}

function MiniBracket() {
  const col = (x: number, n: number, gap: number, top: number) =>
    Array.from({ length: n }, (_, i) => <rect key={`${x}-${i}`} x={x} y={top + i * gap} width={46} height={9} />);
  return (
    <svg viewBox="0 0 250 104" className="h-full w-full p-3" aria-hidden>
      <g className="fill-slate">{[...col(0, 4, 26, 4), ...col(68, 2, 52, 17), ...col(136, 1, 0, 43)]}</g>
      <g className="stroke-line transition-colors duration-500 group-hover:stroke-rose/70" fill="none" strokeWidth={1.5}>
        <path d="M46 8.5h11v26H46M57 21.5h11M46 60.5h11v26H46M57 73.5h11M114 21.5h11v52h-11M125 47.5h11" />
      </g>
      <rect x={196} y={38} width={46} height={19} className="fill-paper/80 transition-colors duration-500 group-hover:fill-rose" />
      <path d="M182 47.5h14" className="stroke-paper/60" strokeWidth={1.5} strokeDasharray="3 3" />
    </svg>
  );
}

function Timeline({ t, timeline, locale }: { t: Dict; timeline: TimelineRow[]; locale: string }) {
  const states = timelineStates(timeline);
  return (
    <ol className="relative mt-6">
      <span className="anim-stitch absolute bottom-3 left-[7px] top-3 border-l-2 border-dashed border-line" aria-hidden />
      {timeline.map((e, i) => {
        const current = states[i] === "now";
        const done = states[i] === "done";
        return (
          <li
            key={e.key}
            className={cn(
              "anim-rise relative flex items-baseline gap-4 py-2 pl-8 pr-3 text-[0.95rem] uppercase transition-colors",
              current ? "bg-slate font-black text-paper" : done ? "text-ash" : "text-paper/80 hover:text-paper",
            )}
            style={{ animationDelay: `${0.2 + i * 0.06}s` }}
          >
            <span className="absolute left-0 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center bg-ink">
              {current ? (
                <>
                  <span className="anim-ping-diamond absolute size-2.5 bg-rose" aria-hidden />
                  <span className="size-2.5 rotate-45 bg-rose" />
                </>
              ) : (
                <span className={cn("size-2 rotate-45", done ? "bg-ash" : "border border-paper/60")} />
              )}
            </span>
            {current && <span className="absolute inset-y-0 left-0 w-0.5 bg-rose" aria-hidden />}
            <span className="flex-1">{t.timeline[e.key]}</span>
            <span className="num whitespace-nowrap text-base normal-case">{fmtRange(locale, e.from, e.to)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function Home() {
  const [t, lang, settings, vis, pools, teams, matches, sponsors, regs, lobbies, staff] = await Promise.all([
    getDict(),
    getLang(),
    getSettings(),
    getVisibility(),
    getPoolStages(),
    getTeams(),
    getMatches(),
    getSponsors(),
    getRegistrations(),
    getLobbies(),
    getPublicStaff(),
  ]);
  const f = await getFill();
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const see = (s: keyof typeof vis.sections) => vis.sections[s];
  const visiblePools = pools.filter((s) => s.pools.length && s.released);
  const early = settings.phase === "qualifiers" || settings.phase === "seeding";
  const pool = early ? visiblePools.find((s) => s.slug === "qualifiers") : visiblePools.at(-1);
  const live = see("streams") ? await getLive() : null;
  const regState = windowState(settings.regOpensAt, settings.regClosesAt);
  const regCloses = see("register") && isFuture(settings.regClosesAt) ? settings.regClosesAt!.toISOString() : null;
  const players = regs.filter((r) => r.status !== "denied");
  const booking = windowState(settings.bookingOpensAt, settings.bookingClosesAt);
  const featured = matches
    .filter((m) => m.winner)
    .sort((a, b) => (b.datetime ?? "").localeCompare(a.datetime ?? ""))
    .slice(0, 3);

  const cards = [
    (see("register") || see("players")) && (
      <EntryCard
        key="reg"
        title={t.home.registration}
        sub={regState === "open" ? f(t.home.regSub) : regState === "soon" ? f(t.home.regSoon) : t.home.regClosed}
        href={see("register") ? "/register" : "/teams/players"}
        className="bg-coal"
      >
        <SignupCount n={players.length} label={t.home.signups(players.length)} />
      </EntryCard>
    ),
    see("lobbies") && lobbies.length > 0 && (
      <EntryCard key="lobbies" title={t.home.lobbies} sub={booking === "open" ? t.home.lobbiesSub(lobbies.length) : t.home.lobbiesClosed(lobbies.length)} href="/qualifiers" className="bg-coal">
        <LobbySlots lobbies={lobbies} />
      </EntryCard>
    ),
    see("mappool") && pool && (
      <EntryCard key="pool" title={t.home.mappool(t.rounds[pool.title] ?? pool.title)} sub={t.home.mapSub(pool.pools.reduce((n, p) => n + p.maps.length, 0))} href="/mappool" className="bg-slate">
        <ModChips stage={pool} />
      </EntryCard>
    ),
    see("teams") && teams.length > 0 && (
      <EntryCard key="teams" title={t.home.teams} sub={t.home.teamsSub(teams.length, teams.length * 3)} href="/teams" className="bg-coal">
        <TeamMosaic teams={teams} />
      </EntryCard>
    ),
    see("bracket") && (
      <EntryCard key="bracket" title={t.home.bracket} sub={t.home.bracketSub} href="/schedule/bracket" className="bg-coal">
        <MiniBracket />
      </EntryCard>
    ),
    see("players") && players.length > 0 && (
      <EntryCard key="players" title={t.home.players} sub={t.home.playersSub} href="/teams/players" className="bg-coal">
        <AvatarCloud people={players.map((p) => ({ id: p.osuId, avatar: p.avatarUrl }))} />
      </EntryCard>
    ),
    see("info") && (
      <EntryCard key="info" title={t.home.info} sub={t.home.infoSub} href="/info" className="bg-coal">
        <FormatBadge tags={t.home.formatTags} />
      </EntryCard>
    ),
    see("staff") && staff.length > 0 && (
      <EntryCard key="staff" title={t.home.staff} sub={t.home.staffSub(staff.length)} href="/staff" className="bg-coal">
        <AvatarCloud people={staff.map((s) => ({ id: s.osuId, avatar: s.avatarUrl }))} />
      </EntryCard>
    ),
  ]
    .filter(Boolean)
    .slice(0, 4);

  return (
    <>
      <section className="grain relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[70%] overflow-hidden [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden>
          <div className="anim-drift h-full w-[calc(100%+120px)] bg-[repeating-linear-gradient(115deg,transparent_0_52.4px,rgba(255,255,255,0.03)_52.4px_54.4px)]" />
        </div>
        <div
          className="anim-page pointer-events-none absolute right-[2%] top-1/2 -translate-y-1/2 font-display text-[clamp(20rem,42vw,40rem)] font-black italic leading-[0.8] text-white/[0.03]"
          style={{ animationDuration: "1.6s" }}
          aria-hidden
        >
          7
        </div>
        <div className="relative mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:pb-16 lg:pt-16">
          <div className="min-w-0">
            <HeroLockup label={`${t.home.badge} · 2026`} />
          </div>

          <div className="flex min-w-0 flex-col justify-end">
            <h1 className="anim-rise text-balance text-[clamp(1.8rem,3.2vw,2.9rem)] font-black leading-[1.05] tracking-tight" style={{ animationDelay: "0.25s" }}>
              <Rich text={t.home.headline} />
            </h1>
            <p className="anim-rise mt-5 max-w-[48ch] text-pretty text-lg text-paper/70" style={{ animationDelay: "0.4s" }}>
              {f(t.home.intro)}
            </p>
            <div className="anim-rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.55s" }}>
              {see("register") && <SlantButton href="/register" tone="paper" className="px-5 py-2.5 text-base">{t.home.registerTeam}</SlantButton>}
              {see("info") && <SlantButton href="/info" tone="outline" className="px-5 py-2.5 text-base">{t.home.readRules}</SlantButton>}
            </div>
          </div>
        </div>
        <dl className="relative mx-auto grid max-w-[1400px] grid-cols-2 border-t border-line sm:grid-cols-4">
          {[1, 6, 7, 8].map((i, k) => (
            <div
              key={i}
              className={cn("anim-rise group px-4 py-4 transition-colors hover:bg-white/[0.02] sm:px-6", k % 2 === 1 && "border-l border-line", k > 1 && "border-t border-line sm:border-t-0", k === 2 && "sm:border-l")}
              style={{ animationDelay: `${0.7 + k * 0.08}s` }}
            >
              <dt className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-ash transition-colors group-hover:text-rose-hi">{t.info.facts[i][0]}</dt>
              <dd className="num mt-1 text-xl text-paper sm:text-2xl">{f(t.info.facts[i][1])}</dd>
            </div>
          ))}
        </dl>
        <div className="anim-grow-x">
          <Tricolor className="h-1" vertical />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-12 px-4 pt-14 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)]">
        <div>
          <h2 className="heading-slam text-3xl">{t.home.timeline}</h2>
          <Timeline t={t} timeline={settings.timeline} locale={locale} />
          {regCloses && (
            <Reveal className="relative mt-8 overflow-hidden border border-line bg-coal p-4" delay={0.2}>
              <div className="text-[0.7rem] font-black uppercase tracking-widest text-ash">{t.home.closesIn}</div>
              <Countdown to={regCloses} from={settings.regOpensAt?.toISOString()} />
            </Reveal>
          )}
        </div>

        <div className="content-start">
          <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2" gap={0.08}>
            {cards.map((c, i) => (
              <StaggerItem key={i}>{c}</StaggerItem>
            ))}
          </Stagger>

          {sponsors.length > 0 && see("sponsors") && (
            <Reveal className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line pt-5" delay={0.1}>
              <span className="text-xs font-black uppercase tracking-widest text-ash">{t.home.backedBy}</span>
              {sponsors.map((s) => (
                <a
                  key={s.id}
                  href={s.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2.5 opacity-80 transition duration-300 hover:-translate-y-0.5 hover:opacity-100"
                >
                  <Avatar src={s.image} className="size-8 grayscale transition duration-300 group-hover:grayscale-0" />
                  <span className="font-display text-base font-bold lowercase">{s.name}</span>
                </a>
              ))}
            </Reveal>
          )}
        </div>
      </section>

      {(see("schedule") || see("streams")) && (
        <section className="mx-auto max-w-[1400px] px-4 pt-20 sm:px-6">
          {see("schedule") && featured.length > 0 && (
            <>
              <Reveal className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
                <h2 className="heading-slam text-4xl">{t.home.previously}</h2>
                <Link href="/schedule" className="group inline-flex items-center gap-1.5 text-sm font-black uppercase text-ash transition-colors hover:text-paper">
                  {t.home.fullSchedule} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Reveal>
              <Stagger className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3" gap={0.1}>
                {featured.map((m) => {
                  const a = teamById(m.team1.id);
                  const b = teamById(m.team2.id);
                  return (
                    <StaggerItem key={m.id} className="lift border border-line bg-coal hover:border-paper/30">
                      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs font-black uppercase text-ash">
                        <span className="text-rose-hi">{roundName(t, m.round)}</span>
                        <span className="num text-sm">{m.datetime && fmtSofia(new Date(m.datetime), locale)}</span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
                        {[a, b].map((team, i) => (
                          <div key={i} className={cn("flex min-w-0 flex-col items-start gap-2", i === 1 && "order-3 items-end text-right")}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={team?.image} alt="" className={cn("size-12 shrink-0 object-cover", m.winner !== i + 1 && "opacity-50 grayscale")} />
                            <span className={cn("line-clamp-2 max-w-full break-words text-sm leading-tight", m.winner === i + 1 ? "font-black text-paper" : "font-bold text-ash")}>{team?.name}</span>
                          </div>
                        ))}
                        <div className="order-2 -skew-x-12 border border-line bg-slate px-3 py-1.5 shadow-[3px_3px_0_0_var(--color-rose-deep)]">
                          <span className="num block skew-x-12 text-2xl text-paper">
                            {m.team1.score ?? 0}-{m.team2.score ?? 0}
                          </span>
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </>
          )}
          {see("streams") && (
            <Reveal className="mt-8 flex flex-col items-start gap-4 border border-line bg-coal p-5 sm:flex-row sm:items-center">
              {live ? (
                <span className="flex items-center gap-2 bg-rose px-2 py-1 text-xs font-black uppercase text-white">
                  <span className="size-2 animate-pulse rounded-full bg-white" /> {t.home.live}
                </span>
              ) : (
                <span className="flex items-center gap-2 bg-slate px-2 py-1 text-xs font-black uppercase text-ash">
                  <Radio className="size-3.5" /> {t.home.offline}
                </span>
              )}
              <p className="text-sm text-paper/75">{live ? (live.title ?? t.home.liveNote) : t.home.streamNote}</p>
              <SlantButton href="/streams" tone={live ? "rose" : "paper"} className="sm:ml-auto">
                {live ? t.home.watchNow : t.home.streamSchedule}
              </SlantButton>
            </Reveal>
          )}
        </section>
      )}
    </>
  );
}
