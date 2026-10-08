import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Crown } from "lucide-react";
import { Sparkle, TriTick } from "@/components/site/graphics";
import { SlantButton } from "@/components/site/page";
import { Words } from "@/components/site/rich";
import { Avatar } from "@/components/site/avatar";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/site/motion";
import { getDict } from "@/lib/i18n/server";
import { type Dict } from "@/lib/i18n/dict";
import { fmtRange, phaseStates, type TimelineRow } from "@/lib/dates";
import { getFill } from "@/db/copy";
import { Countdown } from "@/components/site/countdown";
import { MODS, type Stage, type Team } from "@/lib/data";
import { getMatches, getTeams } from "@/db/tournament";
import { getLang } from "@/lib/i18n/server";
import { fmtSofiaTime, isFuture, windowState } from "@/lib/time";
import { ResultCard } from "@/components/site/result-card";
import { getPoolStages } from "@/db/mappools";
import { getRegistrations } from "@/db/registrations";
import { splitAlive } from "@/lib/alive";
import { getLobbies, type Lobby } from "@/db/lobbies";
import { getPublicStaff } from "@/db/admin";
import { cn } from "@/lib/utils";
import { getSettings } from "@/db/settings";
import { getViewer, getVisibility } from "@/lib/authz";
import { duePhase } from "@/lib/phase-prompt";
import { PhasePrompt } from "@/components/site/phase-prompt";
import { InView } from "@/components/site/in-view";
import { currentOsuId } from "@/auth";
import { login } from "@/app/pickems/actions";
import { HeroGate } from "@/components/site/hero-gate";
import { MeTag } from "@/components/site/me";
import { SKILLS, slotColor } from "@/lib/format-plan";
import { getEdition, getFormat } from "@/db/edition";

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
        <div className="anim-rise mb-[0.12em] flex min-w-0 flex-col gap-2 font-sans text-[clamp(0.6rem,1vw,0.75rem)] font-black uppercase leading-snug tracking-[0.14em] text-ash" style={{ animationDelay: "0.6s" }}>
          <TriTick className="h-3 w-[22px]" />
          <span className="max-w-[26ch]">{label}</span>
        </div>
        <span className="anim-slam relative mr-[0.02em] text-[1.45em] italic leading-[0.74] tracking-[-0.06em]" style={{ animationDelay: "0.35s" }}>
          <span className="anim-echo absolute left-[0.05em] top-[0.035em] pr-[0.3em] text-transparent [-webkit-text-stroke:2px_rgba(244,243,238,0.35)]" aria-hidden>
            7
          </span>
          <span className="relative -mr-[0.3em] pr-[0.3em] text-rose">7</span>
          <span
            className="anim-shine pointer-events-none absolute -left-[0.3em] -top-[0.3em] p-[0.3em] pr-[0.7em] bg-[linear-gradient(105deg,transparent_42%,rgba(255,255,255,0.55)_50%,transparent_58%)] bg-[length:300%_100%] bg-clip-text text-transparent"
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
    <Link href={href} className={cn("lift group relative flex h-36 flex-col sm:h-44 overflow-hidden border border-line hover:border-paper/30", className)}>
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
  const maps = stage.pools.flatMap((p) => p.maps.map((m) => ({ slot: m.slot, color: /^(NM|HD|HR|DT|FM|EZ|TB)\d*$/.test(m.slot) ? MODS[p.category].color : slotColor(m.slot) })));
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

const POOL_MODS = ["NoMod", "Hidden", "HardRock", "DoubleTime", "FreeMod", "Tiebreaker"];

function PoolStack({ stages, skill }: { stages: Stage[]; skill: boolean }) {
  const colors = skill ? [...Object.values(SKILLS).map((s) => s.color), MODS.Tiebreaker.color] : POOL_MODS.filter((m) => MODS[m]).map((m) => MODS[m].color);
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-5" aria-hidden>
      <div className="flex gap-1.5">
        {colors.map((c, i) => (
          <span key={i} className="anim-rise h-7 flex-1 sm:h-9 -skew-x-12 opacity-80 transition-opacity group-hover:opacity-100" style={{ background: c, animationDelay: `${0.3 + i * 0.05}s` }} />
        ))}
      </div>
      <div className="flex gap-x-3 overflow-hidden whitespace-nowrap text-[0.65rem] font-black uppercase text-ash [mask-image:linear-gradient(to_left,transparent,black_2rem)]">
        {stages.map((st) => (
          <span key={st.slug}>{st.title}</span>
        ))}
      </div>
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
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-gold">
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
      <Sparkle className="right-5 top-4 size-4 text-gold" />
      <Sparkle className="right-12 top-10 size-2 text-paper/60" delay={0.9} />
    </Reveal>
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
      {people.slice(0, 18).map((p, i) => (
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
      <span className="flex flex-col gap-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-ash">
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

function Timeline({ t, timeline, locale, states }: { t: Dict; timeline: TimelineRow[]; locale: string; states: ReturnType<typeof phaseStates> }) {
  return (
    <InView as="ol" className="relative mt-6">
      <span className="anim-stitch absolute bottom-3 left-[7px] top-3 border-l-2 border-dashed border-line" aria-hidden />
      {timeline.map((e, i) => {
        const current = states[i] === "now";
        const done = states[i] === "done";
        return (
          <li
            key={e.key}
            className={cn(
              "in-left relative flex items-baseline gap-4 py-2 pl-8 pr-3 text-[0.95rem] uppercase transition-colors",
              current ? "bg-slate font-black text-paper" : done ? "text-ash" : "text-paper/80 hover:text-paper",
            )}
            style={{ "--d": "0.3s", "--i": i, "--s": "0.08s" } as React.CSSProperties}
          >
            <span className="in-pop absolute left-0 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center bg-ink" style={{ "--d": "0.45s", "--i": i, "--s": "0.08s" } as React.CSSProperties}>
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
            <span className="in-wipe num whitespace-nowrap text-base normal-case" style={{ "--d": "0.55s", "--i": i, "--s": "0.08s" } as React.CSSProperties}>{fmtRange(locale, e.from, e.to)}</span>
          </li>
        );
      })}
    </InView>
  );
}

export default async function Home() {
  const [t, lang, settings, vis, pools, teams, matches, regs, lobbies, staff] = await Promise.all([
    getDict(),
    getLang(),
    getSettings(),
    getVisibility(),
    getPoolStages(),
    getTeams(),
    getMatches(),
    getRegistrations(),
    getLobbies(),
    getPublicStaff(),
  ]);
  const [f, me, viewer] = await Promise.all([getFill(), currentOsuId(), getViewer()]);
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const see = (s: keyof typeof vis.sections) => vis.sections[s];
  const visiblePools = pools.filter((s) => s.pools.length && s.released);
  const phase = settings.phase;
  const due = viewer?.roles.includes("host") ? duePhase(settings.timeline, phase) : null;
  const prompt = due && settings.phasePrompts[String(viewer!.osuId)] !== due ? due : null;
  const signup = phase === "registration" || phase === "screening";
  const playing = phase === "seeding" || phase === "playoffs";
  const big = "px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-xl shadow-[4px_4px_0_0_var(--color-rose-deep)]";
  const qualPool = phase === "qualifiers" ? visiblePools.find((s) => s.slug === "qualifiers") : undefined;
  const byId = new Map(matches.map((m) => [m.id, m]));
  const gf1 = byId.get("GF-M1");
  const gf2 = byId.get("GF-M2");
  const champSide = gf2?.winner ? gf2 : gf1?.winner === 1 ? gf1 : null;
  const champ = phase === "finished" && champSide ? teamById(champSide.winner === 1 ? champSide.team1.id : champSide.team2.id) : undefined;
  const runnerUp = champ && champSide ? teamById(champSide.winner === 1 ? champSide.team2.id : champSide.team1.id) : undefined;
  const ctaHref: Record<string, string> = { screening: "/teams/players", qualifiers: "/qualifiers", seeding: "/teams", playoffs: "/matches", finished: "/matches" };
  const ctaOk: Record<string, boolean> = { screening: see("players"), qualifiers: see("lobbies"), seeding: see("teams"), playoffs: see("schedule"), finished: see("schedule") };
  const regState = windowState(settings.regOpensAt, settings.regClosesAt);
  const regCloses = phase === "registration" && see("register") && isFuture(settings.regClosesAt) ? settings.regClosesAt!.toISOString() : null;
  const alive = splitAlive(regs, teams, matches, settings.phase);
  const players = alive.players;
  const mine = me ? regs.find((r) => r.osuId === me) : undefined;
  const booking = windowState(settings.bookingOpensAt, settings.bookingClosesAt);
  const featured = matches
    .filter((m) => m.winner)
    .sort((a, b) => (b.datetime ?? "").localeCompare(a.datetime ?? ""))
    .slice(0, 3);

  const cards = [
    signup && (see("register") || see("players")) && (
      <EntryCard
        key="reg"
        title={t.home.registration}
        sub={phase === "screening" ? t.home.regScreening : regState === "open" ? f(t.home.regSub) : regState === "soon" ? f(t.home.regSoon) : t.home.regClosed}
        href={see("register") ? "/register" : "/teams/players"}
        className="bg-coal"
      >
        <SignupCount n={players.length} label={t.home.signups(players.length)} />
      </EntryCard>
    ),
    phase === "qualifiers" && see("lobbies") && lobbies.length > 0 && (
      <EntryCard key="lobbies" title={t.home.lobbies} sub={booking === "open" ? t.home.lobbiesSub(lobbies.length) : t.home.lobbiesClosed(lobbies.length)} href="/qualifiers" className="bg-coal">
        <LobbySlots lobbies={lobbies} />
      </EntryCard>
    ),
    see("mappool") && qualPool && (
      <EntryCard key="pool" title={t.home.mappool(t.rounds[qualPool.title] ?? qualPool.title)} sub={t.home.mapSub(qualPool.pools.reduce((n, p) => n + p.maps.length, 0))} href="/mappool" className="bg-slate">
        <ModChips stage={qualPool} />
      </EntryCard>
    ),
    see("mappool") && !qualPool && visiblePools.length > 0 && (
      <EntryCard key="pools" title={t.home.mappools} sub={t.home.poolsSub(visiblePools.length)} href="/mappool" className="bg-slate">
        <PoolStack skill={getEdition() === "bgcc7"} stages={visiblePools.map((st) => ({ ...st, title: t.rounds[st.title] ?? st.title }))} />
      </EntryCard>
    ),
    see("teams") && teams.length > 0 && (
      <EntryCard key="teams" title={t.home.teams} sub={phase === "playoffs" || phase === "finished" ? t.home.teamsDone(teams.length, teams.length * 3) : t.home.teamsSub(teams.length, teams.length * 3)} href="/teams" className="bg-coal">
        <TeamMosaic teams={teams} />
      </EntryCard>
    ),
    see("schedule") && (
      <EntryCard key="bracket" title={t.home.bracket} sub={phase === "finished" ? t.home.bracketDone : phase === "playoffs" ? t.home.bracketLive : t.home.bracketSub} href="/matches" className="bg-coal">
        <MiniBracket />
      </EntryCard>
    ),
    see("players") && players.length > 0 && (
      <EntryCard key="players" title={t.home.players} sub={alive.playoffs ? t.home.playersAliveSub : t.home.playersSub} href="/teams/players" className="bg-coal">
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
      {prompt && <PhasePrompt current={phase} next={prompt} />}
      <HeroGate className="grain relative overflow-hidden border-b border-line">
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
        <div className="relative mx-auto grid max-w-page grid-cols-[minmax(0,1fr)] gap-8 px-4 pb-10 pt-8 sm:gap-10 sm:px-6 sm:pb-12 sm:pt-10 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:px-10 lg:pb-16 lg:pt-16 2xl:gap-20 2xl:px-14 2xl:pb-24 2xl:pt-24">
          <div className="min-w-0">
            <HeroLockup label={`${t.home.badge} · ${getFormat().year}`} />
          </div>

          <div className="flex min-w-0 flex-col justify-end">
            <h1 className="text-balance text-[clamp(1.8rem,3.2vw,2.9rem)] font-black leading-[1.05] tracking-tight">
              <Words text={f(phase === "finished" ? t.home.headlineDone : t.home.headline)} d={0.35} s={0.055} />
            </h1>
            <p className="mt-4 max-w-[48ch] text-pretty text-base text-paper/70 sm:mt-5 sm:text-lg">
              <Words text={f(phase === "registration" ? t.home.intro : (t.home.introBy[phase] ?? t.home.intro))} d={0.85} s={0.018} />
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9 sm:gap-4" style={{ "--d": "1.45s", "--s": "0.1s" } as React.CSSProperties}>
              {phase === "registration" && see("register") ? (
                <span className="in-pop inline-flex">
                  {mine && mine.status !== "denied" ? (
                    <span className="inline-flex -skew-x-12 cursor-default items-center border border-line bg-slate px-6 py-3 text-base font-black sm:px-8 sm:py-4 sm:text-xl uppercase tracking-wide text-ash" aria-disabled>
                      <span className="inline-flex skew-x-12 items-center gap-2">
                        <Check className="size-5" /> {mine.status === "approved" ? t.me.signedUp : t.me.signedUpPending}
                      </span>
                    </span>
                  ) : (
                    <SlantButton href="/register" tone="paper" className={big}>
                      {t.home.registerTeam} <ArrowRight className="size-5" />
                    </SlantButton>
                  )}
                </span>
              ) : playing ? (
                <span className="in-pop inline-flex">
                  {me ? (
                    <SlantButton href="/me" tone="paper" className={big}>
                      {t.home.myPage} <ArrowRight className="size-5" />
                    </SlantButton>
                  ) : (
                    <form action={login.bind(null, "/me")}>
                      <SlantButton type="submit" tone="paper" className={big}>
                        {t.home.login} <ArrowRight className="size-5" />
                      </SlantButton>
                    </form>
                  )}
                </span>
              ) : (
                ctaOk[phase] && (
                  <span className="in-pop inline-flex">
                    <SlantButton href={ctaHref[phase]} tone="paper" className={big}>
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
          </div>
        </div>
      </HeroGate>

      <section className="mx-auto grid max-w-page grid-cols-[minmax(0,1fr)] gap-12 px-4 pt-14 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:px-10 2xl:gap-16 2xl:px-14">
        <div>
          <h2 className="heading-slam text-3xl">{t.home.timeline}</h2>
          <Timeline t={t} timeline={settings.timeline} locale={locale} states={phaseStates(settings.timeline, phase)} />
          {regCloses && (
            <Reveal className="relative mt-8 overflow-hidden border border-line bg-coal p-4" delay={0.2}>
              <div className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-ash">{t.home.closesIn}</div>
              <Countdown to={regCloses} from={settings.regOpensAt?.toISOString()} />
            </Reveal>
          )}
        </div>

        <div className="content-start">
          {champ && <Champion t={t} team={champ} other={runnerUp} />}
          <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2" gap={0.08}>
            {cards.map((c, i) => (
              <StaggerItem key={i}>{c}</StaggerItem>
            ))}
          </Stagger>

        </div>
      </section>

      {see("schedule") && featured.length > 0 && (
        <section className="mx-auto max-w-page px-4 pt-14 sm:px-6 sm:pt-20 lg:px-10 2xl:px-14">
          <Reveal className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <h2 className="heading-slam text-3xl sm:text-4xl">{t.home.previously}</h2>
            <Link href="/matches" className="group inline-flex items-center gap-1.5 text-sm font-black uppercase text-ash transition-colors hover:text-paper">
              {t.home.fullSchedule} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
          <Stagger className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" gap={0.1}>
            {featured.map((m, fi) => (
              <StaggerItem key={m.id} className={cn(fi === 2 && "hidden lg:block")}>
                <ResultCard m={m} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}
    </>
  );
}
