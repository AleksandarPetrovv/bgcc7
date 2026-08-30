import Link from "next/link";
import { ArrowRight, CalendarClock, ChevronDown, Crown, ExternalLink, Flag, Mic, Tv, Video } from "lucide-react";
import { Container, PageTitle, SlantButton, Tag } from "@/components/site/page";
import { TriTick } from "@/components/site/graphics";
import { Avatar } from "@/components/site/avatar";
import { Countdown } from "@/components/site/countdown";
import { MatchDialog } from "@/components/site/match-dialog";
import { currentOsuId } from "@/auth";
import { login } from "@/app/pickems/actions";
import { getDict, getLang } from "@/lib/i18n/server";
import { roundName, type Dict } from "@/lib/i18n/dict";
import { getSettings } from "@/db/settings";
import { getRegistrations } from "@/db/registrations";
import { getLobbies, mpIds } from "@/db/lobbies";
import { getQualResults } from "@/db/qualifiers";
import { getMatches, getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getScoreboard } from "@/db/scoreboards";
import { fmtRange, phaseStates } from "@/lib/dates";
import { fmtSofia, fmtSofiaTime, isFuture, windowState } from "@/lib/time";
import { flagUrl, fmtNum, MODS, type Match, type Team } from "@/lib/data";
import { sourceLabel, isLive } from "@/lib/matches";
import { osuUser, TWITCH_URL } from "@/lib/links";
import type { MapResult, PlayerLine } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";

const v = (o: Record<string, string | number>) => o as React.CSSProperties;
const label = "text-[0.65rem] font-black uppercase tracking-[0.14em] text-ash";

function Card({ title, children, className, i = 0, right, flush }: { title: string; children: React.ReactNode; className?: string; i?: number; right?: React.ReactNode; flush?: boolean }) {
  return (
    <section className={cn("in-up relative overflow-hidden border border-line bg-coal", className)} style={v({ "--i": i, "--s": "0.08s", "--d": "0.2s" })}>
      <div className="flex items-center gap-2.5 px-5 pb-1 pt-4">
        <TriTick className="h-2.5 w-[18px]" />
        <h2 className="heading-slam text-lg">{title}</h2>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className={flush ? "pt-3" : "p-5 pt-3"}>{children}</div>
    </section>
  );
}

function Stat({ k, n, className }: { k: string; n: string; className?: string }) {
  return (
    <div className={cn("border-l-2 border-line pl-3", className)}>
      <div className={label}>{k}</div>
      <div className="num mt-1 text-3xl leading-none">{n}</div>
    </div>
  );
}

function PlayerLink({ id, name, className }: { id: number; name: string; className?: string }) {
  return (
    <a href={osuUser(id)} target="_blank" rel="noreferrer" className={cn("transition-colors hover:text-rose-hi", className)}>
      {name}
    </a>
  );
}

function TeamCard({ t, team, me, record, i }: { t: Dict; team: Team; me: number; record?: [number, number]; i?: number }) {
  const avg = Math.round(team.players.reduce((n, p) => n + p.rank, 0) / Math.max(1, team.players.length));
  return (
    <Card title={t.me.team} i={i} flush>
      <div className="relative mx-5 flex items-center gap-4 overflow-hidden border border-line bg-ink p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="pointer-events-none absolute inset-0 size-full scale-110 object-cover opacity-15 blur-md" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="relative size-16 shrink-0 object-cover" />
        <div className="relative min-w-0 flex-1">
          <div className="heading-slam break-words text-2xl leading-tight">{team.name}</div>
          <div className="num mt-1 flex flex-wrap gap-x-4 text-sm text-paper/70">
            <span>{t.me.seed(team.seed)}</span>
            {record && <span className="text-balkan">{t.me.record(record[0], record[1])}</span>}
            <span>
              {t.me.avgRank} #{fmtNum(avg)}
            </span>
          </div>
        </div>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {team.players.map((p) => (
          <li key={p.userId} className="flex items-center gap-3 px-5 py-2.5">
            <Avatar src={p.avatar} className="size-9" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(p.country)} alt="" className="h-3" />
            <PlayerLink id={p.userId} name={p.username} className={cn("min-w-0 truncate font-black", p.userId === me && "text-balkan")} />
            {p.userId === me && <span className="text-[0.6rem] font-black uppercase text-ash">{t.me.you}</span>}
            {p.isCaptain && <Crown className="size-3.5 shrink-0 text-[#e8c547]" aria-label={t.common.captain} />}
            <span className="num ml-auto text-sm text-paper/80">#{fmtNum(p.rank)}</span>
            <span className="num w-16 text-right text-sm text-ash">{fmtNum(Math.round(p.pp))}pp</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-5 py-3">
        <Link href={`/teams/${team.id}`} className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-ash transition-colors hover:text-paper">
          {t.me.teamPage} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function Side({ team, flip, fallback }: { team?: Team; flip?: boolean; fallback?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-4", flip && "flex-row-reverse text-right")}>
      {team ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.image} alt="" className="size-16 shrink-0 object-cover sm:size-20" />
      ) : (
        <span className="size-16 shrink-0 border border-dashed border-line sm:size-20" />
      )}
      <div className="min-w-0">
        <div className="heading-slam break-words text-xl leading-tight sm:text-2xl">{team?.name ?? fallback}</div>
        {team && (
          <div className={cn("mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-paper/70", flip && "justify-end")}>
            {team.players.map((p) => (
              <PlayerLink key={p.userId} id={p.userId} name={p.username} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ icon: Icon, k, n }: { icon: typeof Flag; k: string; n: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3">
      <Icon className="size-4 shrink-0 text-rose-hi" />
      <div className="min-w-0">
        <div className={label}>{k}</div>
        <div className="truncate text-sm font-black">{n}</div>
      </div>
    </div>
  );
}

type Best = { p: PlayerLine; map: MapResult; match: Match };

function BestPlay({ t, best, other }: { t: Dict; best: Best; other?: Team }) {
  const color = best.map.mod ? MODS[best.map.mod]?.color : undefined;
  return (
    <details className="group col-span-2 border-l-2 border-rose pl-3">
      <summary className="flex cursor-pointer list-none items-end gap-3">
        <div>
          <div className={label}>{t.me.bestScore}</div>
          <div className="num mt-1 text-3xl leading-none text-rose-hi">{fmtNum(best.p.score)}</div>
        </div>
        <span className="mb-0.5 ml-auto inline-flex items-center gap-1 text-xs font-black uppercase text-ash transition-colors group-hover:text-paper">
          {best.map.slot ?? "—"} <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="relative mt-3 overflow-hidden border border-line bg-ink">
        {best.map.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={best.map.cover} alt="" className="absolute inset-0 size-full object-cover opacity-20" />
        )}
        <div className="relative flex items-center gap-3 p-3">
          <span className="heading-slam shrink-0 border-l-[3px] bg-ink/80 px-2 py-1 text-lg" style={{ borderColor: color ?? "var(--color-line)" }}>
            {best.map.slot ?? "—"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black">
              {best.map.artist && <span className="text-paper/70">{best.map.artist} - </span>}
              {best.map.title}
            </div>
            <div className="truncate text-xs text-ash">
              [{best.map.version}] · {roundName(t, best.match.round)} · {t.common.vs} {other?.name}
            </div>
          </div>
          <div className="text-right">
            <div className="num text-sm">{(best.p.acc * 100).toFixed(2)}%</div>
            {best.p.mods.length > 0 && <div className="text-[0.65rem] font-black uppercase text-ash">+{best.p.mods.join("")}</div>}
          </div>
          <MatchDialog match={best.match} compact />
        </div>
      </div>
    </details>
  );
}

export default async function Me() {
  const [t, lang, me] = await Promise.all([getDict(), getLang(), currentOsuId()]);
  if (!me)
    return (
      <Container plain>
        <PageTitle mark="people">{t.me.title}</PageTitle>
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <p className="text-ash">{t.me.login}</p>
          <form action={login.bind(null, "/me")}>
            <SlantButton type="submit" tone="paper" className="px-7 py-3.5 text-lg">
              {t.home.login}
            </SlantButton>
          </form>
        </div>
      </Container>
    );

  const [settings, regs, lobbies, qual, teams, matches, stages] = await Promise.all([
    getSettings(),
    getRegistrations(),
    getLobbies(),
    getQualResults(),
    getTeams(),
    getMatches(),
    getPoolStages(),
  ]);
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const phase = settings.phase;
  const signupPhase = phase === "registration" || phase === "screening";
  const reg = regs.find((r) => r.osuId === me);
  const team = teams.find((x) => x.players.some((p) => p.userId === me));
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const fmt = (d: Date | string) => `${fmtSofia(new Date(d), locale)} EET`;
  const phaseKey: Record<string, string> = { registration: "reg", screening: "scr", qualifiers: "qual", seeding: "seed", playoffs: "play", finished: "done" };

  const header = (
    <section className="in-up relative mb-5 overflow-hidden border border-line bg-coal" style={v({ "--d": "0.1s" })}>
      {team && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.image} alt="" className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-[0.12] [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden />
      )}
      <div className="relative flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <Avatar src={reg?.avatarUrl} className="size-20" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {reg?.country && <img src={flagUrl(reg.country)} alt="" className="h-4" />}
            <span className="heading-slam break-words text-4xl">{reg?.username ?? t.me.title}</span>
          </div>
          {reg && (
            <div className="num mt-2 flex flex-wrap gap-x-5 text-base text-paper/70">
              {reg.rank !== null && <span>#{fmtNum(reg.rank)}</span>}
              {reg.countryRank !== null && (
                <span className="text-balkan">
                  {reg.country} #{reg.countryRank}
                </span>
              )}
              {reg.pp !== null && <span>{fmtNum(Math.round(reg.pp))}pp</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex -skew-x-12 border border-line bg-ink px-3 py-1">
            <span className="skew-x-12 text-xs font-black uppercase tracking-[0.14em] text-paper/80">{t.timeline[phaseKey[phase]]}</span>
          </span>
          {reg && signupPhase && (
            <Tag tone={reg.status === "approved" ? "balkan" : reg.status === "denied" ? "rose" : "paper"} className="text-xs">
              {t.register.statusText[reg.status]}
            </Tag>
          )}
        </div>
      </div>
    </section>
  );

  const shell = (children: React.ReactNode) => (
    <Container plain>
      <PageTitle mark="people">{t.me.title}</PageTitle>
      {header}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">{children}</div>
    </Container>
  );

  const states = phaseStates(settings.timeline, phase);
  const upcoming = (
    <Card title={t.me.whatsNext} i={2}>
      <ol className="space-y-1">
        {settings.timeline.map((e, i) => (
          <li
            key={e.key}
            className={cn(
              "relative flex items-baseline gap-3 py-1.5 pl-3 text-sm uppercase",
              states[i] === "now" ? "bg-slate font-black text-paper" : states[i] === "done" ? "text-ash" : "text-paper/80",
            )}
          >
            {states[i] === "now" && <span className="absolute inset-y-0 left-0 w-0.5 bg-rose" />}
            <span className={cn("size-2 shrink-0 rotate-45", states[i] === "now" ? "bg-rose" : states[i] === "done" ? "bg-ash" : "border border-paper/60")} />
            <span className="flex-1">{t.timeline[e.key]}</span>
            <span className="num pr-2 normal-case">{fmtRange(locale, e.from, e.to)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );

  if (!reg && signupPhase)
    return shell(
      <>
        <Card title={t.me.signup} i={1}>
          <p className="text-paper/80">{t.me.notIn}</p>
          {phase === "registration" && (
            <SlantButton href="/register" tone="paper" className="mt-5 px-7 py-3.5 text-lg">
              {t.home.registerTeam} <ArrowRight className="size-5" />
            </SlantButton>
          )}
        </Card>
        {upcoming}
      </>,
    );

  if (signupPhase) {
    const closes = phase === "registration" && isFuture(settings.regClosesAt) ? settings.regClosesAt!.toISOString() : null;
    return shell(
      <>
        <Card title={t.me.signup} i={1}>
          <p className="text-lg leading-snug text-paper/90">{t.register.doneTexts[reg!.status]}</p>
          {reg!.status === "denied" && reg!.note && <p className="mt-3 border-l-2 border-rose pl-3 text-sm text-paper/70">{reg!.note}</p>}
          {phase === "screening" && reg!.status === "pending" && <p className="mt-3 text-sm text-ash">{t.me.screeningNote}</p>}
          {closes && (
            <div className="mt-5 border-t border-line pt-4">
              <div className={label}>{t.me.regCloses}</div>
              <Countdown to={closes} from={settings.regOpensAt?.toISOString()} />
            </div>
          )}
        </Card>
        {upcoming}
      </>,
    );
  }

  const myQual = qual.players.findIndex((p) => p.id === me);
  const qp = myQual >= 0 ? qual.players[myQual] : null;
  const qualTable = qp && (
    <Card title={t.me.yourScores} i={3} className="lg:col-span-2" flush>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className={cn("border-y border-line text-left", label)}>
              <th className="px-5 py-2">{t.me.map}</th>
              <th className="py-2 pr-4 text-right">{t.me.score}</th>
              <th className="py-2 pr-4 text-right">{t.me.acc}</th>
              <th className="py-2 pr-5 text-right">{t.me.mapRank}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {qual.maps.map((m) => {
              const p = qp.perf[m.id];
              return (
                <tr key={m.id}>
                  <td className="px-5 py-2.5">
                    <span className="heading-slam mr-3 text-base">{m.slot}</span>
                    <span className="text-paper/70">{m.title}</span>
                  </td>
                  <td className="num py-2.5 pr-4 text-right text-base">{p ? fmtNum(p.score) : "—"}</td>
                  <td className="num py-2.5 pr-4 text-right text-ash">{p ? `${p.acc.toFixed(2)}%` : "—"}</td>
                  <td className={cn("num py-2.5 pr-5 text-right", p?.placement === 1 && "text-[#e8c547]")}>{p ? `#${p.placement}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  if (phase === "qualifiers") {
    const booking = windowState(settings.bookingOpensAt, settings.bookingClosesAt);
    const lobby = lobbies.find((l) => l.players.some((p) => p.osuId === me));
    const approved = reg?.status === "approved";
    return shell(
      <>
        <Card title={t.me.lobby} i={1} className="lg:col-span-2">
          {!approved ? (
            <p className="text-paper/80">{reg ? t.register.doneTexts[reg.status] : t.me.notInLate}</p>
          ) : lobby ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="flex items-center gap-4">
                  <span className="num bg-rose px-3 py-2 text-3xl leading-none text-white">{fmtSofiaTime(lobby.startsAt)}</span>
                  <div>
                    <div className="heading-slam text-3xl leading-none">{lobby.name}</div>
                    <div className="num mt-1 text-sm text-ash">{fmt(lobby.startsAt)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <Stat k={t.me.referee} n={lobby.referee ?? t.common.tbd} />
                  <Stat k={t.me.inLobby} n={`${lobby.players.length}/${lobby.capacity}`} />
                </div>
              </div>
              <ul className="flex flex-wrap gap-2">
                {lobby.players.map((p) => (
                  <li key={p.osuId} className={cn("flex items-center gap-2 border px-2.5 py-1.5 text-sm font-bold", p.osuId === me ? "border-balkan/60 bg-balkan/10 text-balkan" : "border-line bg-ink")}>
                    <Avatar src={p.avatarUrl} className="size-6" />
                    <PlayerLink id={p.osuId} name={p.username} />
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-3">
                <SlantButton href="/mappool/qualifiers" tone="paper" className="px-6 py-3 text-base">
                  {t.me.openPool} <ArrowRight className="size-4" />
                </SlantButton>
                {booking === "open" && (
                  <SlantButton href="/qualifiers" tone="outline" className="px-6 py-3 text-base">
                    {t.me.changeLobby}
                  </SlantButton>
                )}
                {mpIds(lobby.mpLinks).map((id) => (
                  <a key={id} href={`https://osu.ppy.sh/community/matches/${id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-black uppercase text-ash hover:text-paper">
                    {t.me.mpLink} <ExternalLink className="size-3.5" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-5">
              <p className="text-lg text-paper/85">
                {booking === "open" ? t.me.noLobby : booking === "soon" && settings.bookingOpensAt ? t.me.bookingSoon(fmt(settings.bookingOpensAt)) : t.me.bookingClosed}
              </p>
              <div className="flex flex-wrap gap-3">
                {booking === "open" && (
                  <SlantButton href="/qualifiers" tone="paper" className="px-8 py-4 text-xl shadow-[4px_4px_0_0_var(--color-rose-deep)]">
                    {t.me.pickLobby} <ArrowRight className="size-5" />
                  </SlantButton>
                )}
                <SlantButton href="/mappool/qualifiers" tone="outline" className="px-6 py-4 text-base">
                  {t.me.openPool}
                </SlantButton>
              </div>
            </div>
          )}
        </Card>
        {qualTable}
      </>,
    );
  }

  const cut = settings.qualifyCount;
  const placementCard = qp && (
    <Card title={t.me.placement} i={1}>
      <div className="flex items-end gap-3">
        <span className="num text-7xl leading-[0.8]">#{myQual + 1}</span>
        <span className="pb-1 text-sm text-ash">{t.me.ofN(qual.players.length)}</span>
        <Tag tone={myQual < cut ? "balkan" : "rose"} className="mb-1 ml-auto text-xs">
          {myQual < cut ? t.me.qualified : t.me.notQualified}
        </Tag>
      </div>
      <div className="mt-4 h-1.5 bg-ink">
        <div className={cn("h-full", myQual < cut ? "bg-balkan" : "bg-rose/70")} style={{ width: `${Math.max(4, 100 - (myQual / Math.max(1, qual.players.length - 1)) * 100)}%` }} />
      </div>
    </Card>
  );

  if (phase === "seeding" || !team)
    return shell(
      <>
        {!qp && !team && (
          <Card title={t.me.signup} i={1} className="lg:col-span-2">
            <p className="text-paper/80">{t.me.notInLate}</p>
          </Card>
        )}
        {placementCard}
        {team ? (
          <TeamCard t={t} team={team} me={me} i={2} />
        ) : (
          qp && (
            <Card title={t.me.team} i={2}>
              <p className="text-ash">{t.me.noTeam}</p>
            </Card>
          )
        )}
        {qualTable}
      </>,
    );

  const mine = matches.filter((m) => m.team1.id === team.id || m.team2.id === team.id);
  const played = mine.filter((m) => m.winner).sort((a, b) => (a.datetime ?? "").localeCompare(b.datetime ?? ""));
  const usWon = (m: Match) => (m.team1.id === team.id ? m.winner === 1 : m.winner === 2);
  const record: [number, number] = [played.filter(usWon).length, played.filter((m) => !usWon(m)).length];
  const upcomingMatch = mine.filter((m) => !m.winner).sort((a, b) => (a.datetime ?? "9").localeCompare(b.datetime ?? "9"))[0];
  const lostIn = played.find((m) => (m.bracket === "losers" || m.bracket === "grand") && !usWon(m));
  const gfWon = played.some((m) => m.bracket === "grand" && usWon(m));
  const champion = gfWon && !upcomingMatch;
  const path = champion ? "champion" : lostIn && !upcomingMatch ? "out" : (upcomingMatch?.bracket ?? played.at(-1)?.bracket ?? "winners");
  const pathTag = (
    <span className={cn("text-xs font-black uppercase tracking-wide", path === "out" ? "text-rose-hi" : path === "champion" ? "text-[#e8c547]" : "text-balkan")}>{t.me.path[path]}</span>
  );

  const boards = await Promise.all(
    played.map((m) => Promise.race([getScoreboard(m, teams, stages), new Promise<null>((r) => setTimeout(() => r(null), 5000))]).catch(() => null)),
  );
  const plays: Best[] = boards.flatMap((b, k) =>
    b ? b.maps.filter((x) => !x.note).flatMap((map) => [...map.players[0], ...map.players[1]].filter((p) => p.id === me && p.score > 0).map((p) => ({ p, map, match: played[k] }))) : [],
  );
  const best = plays.reduce<Best | null>((a, b) => (!a || b.p.score > a.p.score ? b : a), null);
  const statsCard = (
    <Card title={t.me.stats} i={3}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <Stat k={t.me.mapsPlayed} n={String(plays.length)} />
        <Stat k={t.me.totalScore} n={fmtNum(plays.reduce((n, x) => n + x.p.score, 0))} />
        <Stat k={t.me.avgAcc} n={plays.length ? `${((plays.reduce((n, x) => n + x.p.acc, 0) / plays.length) * 100).toFixed(2)}%` : "—"} />
        <Stat k={t.me.history} n={t.me.record(record[0], record[1])} />
        {best && <BestPlay t={t} best={best} other={teamById(best.match.team1.id === team.id ? best.match.team2.id : best.match.team1.id)} />}
      </div>
    </Card>
  );

  const historyCard = (
    <Card title={t.me.history} i={4} flush>
      {played.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ash">—</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {played.map((m) => {
            const us = m.team1.id === team.id ? 1 : 2;
            const other = teamById(us === 1 ? m.team2.id : m.team1.id);
            const won = usWon(m);
            return (
              <li key={m.id} className={cn("relative flex items-center gap-3 px-5 py-3 text-sm", won ? "bg-balkan/[0.06]" : "bg-rose/[0.05]")}>
                <span className={cn("absolute inset-y-0 left-0 w-0.5", won ? "bg-balkan" : "bg-rose/70")} />
                <span className={cn("num w-4 text-center text-lg", won ? "text-balkan" : "text-rose-hi")}>{won ? t.me.won : t.me.lost}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {other && <img src={other.image} alt="" className="size-8 shrink-0 object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">{other?.name}</div>
                  <div className="truncate text-[0.65rem] font-black uppercase tracking-wide text-ash">{roundName(t, m.round)}</div>
                </div>
                <span className="num text-xl">
                  {us === 1 ? m.team1.score : m.team2.score}
                  <span className="text-ash">-</span>
                  {us === 1 ? m.team2.score : m.team1.score}
                </span>
                {m.links.length > 0 && <MatchDialog match={m} compact />}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );

  if (phase === "finished") {
    const lf = played.find((m) => m.id === "LB-R4-M1" && !usWon(m));
    const place = champion ? 0 : lostIn?.bracket === "grand" ? 1 : lf ? 2 : -1;
    return shell(
      <>
        <Card title={t.me.finish} i={1} className={cn(place === 0 && "border-[#e8c547]/40")}>
          <div className="flex items-center gap-4">
            {place === 0 && <Crown className="size-12 text-[#e8c547]" />}
            <span className={cn("heading-slam text-6xl", place === 0 && "text-[#e8c547]")}>
              {place >= 0 ? t.me.places[place] : lostIn ? t.me.outIn(roundName(t, lostIn.round)) : "—"}
            </span>
          </div>
        </Card>
        {statsCard}
        <div className="flex flex-col gap-5">
          <TeamCard t={t} team={team} me={me} record={record} i={2} />
        </div>
        {historyCard}
      </>,
    );
  }

  let nextCard: React.ReactNode;
  if (!upcomingMatch) {
    nextCard = (
      <Card title={t.me.next} i={1} className="lg:col-span-2" right={pathTag}>
        <p className="text-ash">{t.me.noNext}</p>
      </Card>
    );
  } else {
    const m = upcomingMatch;
    const us = m.team1.id === team.id ? 1 : 2;
    const other = teamById(us === 1 ? m.team2.id : m.team1.id);
    const live = isLive(m);
    const stage = stages.find((s) => s.slug === m.stage);
    nextCard = (
      <Card title={t.me.next} i={1} className="lg:col-span-2" right={pathTag} flush>
        <div className="px-5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-rose-hi">{roundName(t, m.round)}</span>
            {live && (
              <a href={TWITCH_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-black uppercase text-rose-hi">
                <span className="size-2 animate-pulse rounded-full bg-rose" /> {t.home.live}
              </a>
            )}
          </div>
          <div className="grid grid-cols-1 items-center gap-5 py-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Side team={team} />
            <span className="mx-auto -skew-x-12 bg-rose px-4 py-2 shadow-[3px_3px_0_0_var(--color-rose-deep)]">
              <span className="heading-slam block skew-x-12 text-2xl text-white">{t.common.vs}</span>
            </span>
            <Side team={other} flip fallback={sourceLabel(t, matches, m.id, us === 1 ? 2 : 1)} />
          </div>
        </div>
        <div className="grid grid-cols-2 border-y border-line bg-ink sm:grid-cols-4 sm:divide-x sm:divide-line">
          <Info icon={CalendarClock} k={t.me.when} n={m.datetime ? fmt(m.datetime) : t.common.tbd} />
          <Info icon={Flag} k={t.me.referee} n={m.referee ?? t.common.tbd} />
          <Info icon={Video} k={t.me.stream} n={m.streamer ?? t.common.tbd} />
          <Info icon={Mic} k={t.me.casters} n={m.commentators ?? t.common.tbd} />
        </div>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <SlantButton href={`/mappool/${m.stage}`} tone="paper" className="px-6 py-3 text-base">
            {t.me.pool} · {roundName(t, stage?.title ?? m.stage)} <ArrowRight className="size-4" />
          </SlantButton>
          <SlantButton href="/matches" tone="outline" className="px-5 py-3">
            {t.home.bracket}
          </SlantButton>
          <SlantButton href={TWITCH_URL} tone="outline" className="px-5 py-3">
            <Tv className="size-4" /> {t.me.watch}
          </SlantButton>
        </div>
      </Card>
    );
  }

  return shell(
    <>
      {nextCard}
      <div className="flex flex-col gap-5">
        <TeamCard t={t} team={team} me={me} record={record} i={2} />
        {historyCard}
      </div>
      <div className="flex flex-col gap-5">
        {statsCard}
        {placementCard}
      </div>
    </>,
  );
}
