import { ArrowRight, CalendarClock, Crown, ExternalLink, Flag, Tv, Video } from "lucide-react";
import { Container, Tag } from "@/components/site/page";
import { PageTitle } from "@/components/site/page-title";
import { SlantBg, SlantButton } from "@/components/site/slant";
import { Pfp } from "@/components/site/pfp";
import { Countdown } from "@/components/site/countdown";
import { canSee } from "@/lib/authz";
import { login } from "@/actions/auth";
import { getDict, getLang } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { getSettings } from "@/db/settings";
import { getRegistrations } from "@/db/registrations";
import { getLobbies } from "@/db/lobbies";
import { getQualResults } from "@/db/qualifiers";
import { getMatches, getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { bwsRanking, getPlayerSeeds } from "@/db/seeds";
import { canLinkDiscord } from "@/db/schedule";
import { getMe, userLink } from "@/db/viewer";
import { discordProfile } from "@/lib/discord";
import { Connections } from "./connections";
import { RoleChip, staffCards } from "./staff";
import { forbidden, redirect } from "next/navigation";
import { noDuties } from "@/lib/roles";
import { MatchRow } from "@/components/site/match-row";
import { avatarPath } from "@/lib/avatar";
import { scoreboardOrNull } from "@/db/scoreboards";
import { phaseStates } from "@/lib/dates";
import { Timeline } from "@/components/site/timeline";
import { fmtSofia, fmtSofiaDay, fmtSofiaTime, isFuture, windowState, tzLabel } from "@/lib/time";
import { fmtNum, type Match } from "@/lib/data";
import { cardLabels, sourceLabel, isLive, wonBy, recordOf, upcomingMatches, finalResult } from "@/lib/matches";
import { FitLabel } from "@/components/site/fit-label";
import { playerCount } from "@/lib/format";
import { getFormat } from "@/db/edition";
import { TWITCH_URL, osuMatch } from "@/lib/links";
import { cn } from "@/lib/utils";
import { matchCosts } from "@/lib/match-cost";
import { Card, Stat, PlayerLink, TeamCard, Side, Info, label } from "./cards";
import { QualifierPlacement, QualifierScores } from "./qualifier-scores";
import { isBGCC6 } from "@/db";
import { safe } from "@/db/safe";
import { at } from "@/components/site/rich";
import { localeOf } from "@/lib/i18n/locale";
import { mpIds } from "@/lib/mp-links";


export default async function Me({ searchParams }: PageProps<"/me">) {
  const [t, lang, viewer] = await Promise.all([getDict(), getLang(), getMe()]);
  if (!viewer)
    return (
      <Container plain>
        <PageTitle mark="me">{t.me.title}</PageTitle>
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <p className="text-ash">{t.me.login}</p>
          <form action={login.bind(null, "/me?in=1")}>
            <SlantButton type="submit" tone="paper" className="px-7 py-3.5 text-lg">
              {t.home.login}
            </SlantButton>
          </form>
        </div>
      </Container>
    );

  // someone who just signed in from this page and is not in the tournament lands on the home page instead of a 403
  if (viewer.noPage) return (await searchParams).in ? redirect("/") : forbidden();

  const [settings, regs, lobbies, qual, teams, matches, stages, schedule, seeds] = await Promise.all([
    getSettings(),
    getRegistrations(),
    getLobbies(),
    getQualResults(),
    getTeams(),
    getMatches(),
    getPoolStages(),
    canSee("schedule"),
    getPlayerSeeds(),
  ]);
  const me = viewer.osuId;
  const locale = localeOf(lang);
  const phase = settings.phase;
  const signupPhase = phase === "registration" || phase === "screening";
  const reg = regs.find((r) => r.osuId === me);
  const team = teams.find((x) => x.id === viewer.teamOf);
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const fmt = (d: Date | string) => `${fmtSofia(new Date(d), locale)} ${tzLabel(new Date(d))}`;

  const dcRow = canLinkDiscord() ? await safe(() => userLink(me), null) : null;
  const dcProfile = dcRow?.id ? await discordProfile(dcRow.id) : null;
  const discord = dcRow ? { name: dcRow.id ? (dcProfile?.name ?? dcRow.name ?? dcRow.id) : null, avatar: dcProfile?.avatar ?? null } : isBGCC6() ? { name: null, avatar: null } : undefined;
  const osuName = team?.players.find((p) => p.userId === me)?.username ?? dcRow?.username ?? String(me);
  const connCard = (i: number, className?: string) => (
    <Card title={t.me.connections} i={i} className={cn("flex flex-col self-stretch", className)} body="flex-1">
      <Connections osu={{ id: me, name: osuName, avatar: avatarPath(me) }} discord={discord} canLink={!isBGCC6()} />
    </Card>
  );
  const earlyConn = discord && connCard(3);

  // hosts run everything from the admin panel; the staff cards are for everyone else on the crew with something to do
  const crew = viewer.roles.includes("host") ? [] : viewer.roles.filter((r) => !noDuties(r));
  const staff = crew.length ? await staffCards({ t, lang, locale, me, roles: crew, matches, teams, stages, settings }) : [];
  const chips = crew.length > 0 && crew.map((r) => <RoleChip key={r} role={r} t={t} />);

  // a player who is also on the crew gets the staff cards under their own
  const shell = (children: React.ReactNode, own = false) => (
    <Container plain>
      <PageTitle mark="me" right={chips}>{t.me.title}</PageTitle>
      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-14 pt-2 lg:grid-cols-2 2xl:gap-x-16">
        {children}
        {!own && staff}
      </div>
    </Container>
  );

  const states = phaseStates(settings.timeline, phase);
  const upcoming = (
    <Card title={t.me.whatsNext} i={2} body="pt-0">
      <Timeline t={t} timeline={settings.timeline} locale={locale} states={states} d={0.3} className="mt-4" />
    </Card>
  );

  if (crew.length && !reg && !team)
    return shell(
      <>
        {staff}
        {upcoming}
        {connCard(3)}
      </>,
      true,
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
        {earlyConn}
      </>,
    );

  const ff = getFormat();
  const ranked = !isBGCC6() ? await bwsRanking() : [];
  const bwsAt = ranked.findIndex((r) => r.osuId === me);
  const myBws = bwsAt >= 0 ? ranked[bwsAt] : null;
  const bwsTier = bwsAt < 0 ? 0 : bwsAt < ff.teams ? 1 : bwsAt < playerCount(ff) ? 2 : 0;
  const bwsCard = myBws && (
    <Card title="BWS" i={0}>
      <div className="flex items-end gap-3">
        <span className="num text-6xl leading-[0.8] sm:text-7xl">#{bwsAt + 1}</span>
        <span className="pb-1 text-sm text-ash">{t.me.ofN(ranked.length)}</span>
        <Tag tone={bwsTier ? "balkan" : "rose"} className="mb-1 ml-auto text-xs">
          {bwsTier ? t.admin.tier(bwsTier) : t.me.outsideCut(playerCount(ff))}
        </Tag>
      </div>
      <div className="num mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-sm text-paper/80">
        <span>BWS {fmtNum(myBws.bws ?? 0)}</span>
        {myBws.rank && <span>#{fmtNum(myBws.rank)}</span>}
        <span>
          {myBws.badgeCount} {t.admin.badges.toLowerCase()}
        </span>
      </div>
    </Card>
  );

  if (signupPhase) {
    const closes = phase === "registration" && isFuture(settings.regClosesAt) ? settings.regClosesAt!.toISOString() : null;
    return shell(
      <>
        {bwsCard}
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
        {earlyConn}
      </>,
    );
  }

  const myQual = qual.players.findIndex((p) => p.id === me);
  const qp = myQual >= 0 ? qual.players[myQual] : null;
  const qualTable = qp && <QualifierScores t={t} maps={qual.maps} player={qp} />;

  // bgcc7's qualifiers phase is player seeding: no lobbies, it falls through to the bws card
  if (phase === "qualifiers" && isBGCC6()) {
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
                  <li key={p.osuId} className={cn("flex items-center gap-2 border px-2.5 py-1.5 text-sm font-display font-bold", p.osuId === me ? "border-balkan/60 bg-balkan/10 text-balkan-hi" : "border-line bg-ink")}>
                    <Pfp src={p.avatarUrl} className="size-6" />
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
                  <a key={id} href={osuMatch(id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-display font-bold text-ash hover:text-paper">
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
                  <SlantButton href="/qualifiers" tone="paper" className="px-8 py-4 text-xl" fill="shadow-[4px_4px_0_0_var(--rose-deep)]">
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
        {earlyConn}
      </>,
    );
  }

  const placementCard = (i = 1) => qp && <QualifierPlacement t={t} placement={myQual} total={qual.players.length} cut={settings.qualifyCount} i={i} />;

  const noTeam = teams.length >= ff.teams ? t.me.notOnTeam : t.me.noTeam;

  if (phase === "seeding" || !team)
    return shell(
      <>
        {!qp && !team &&
          (reg?.status === "denied" ? (
            <Card title={t.me.signup} i={1} className="lg:col-span-2">
              <p className="text-lg leading-snug text-paper/90">{t.register.doneTexts.denied}</p>
              {reg.note && <p className="mt-3 border-l-2 border-rose pl-3 text-sm text-paper/70">{reg.note}</p>}
            </Card>
          ) : myBws ? (
            <>
              {bwsCard}
              <Card title={t.me.team} i={1}>
                <p className="text-ash">{bwsTier ? noTeam : t.me.outsideCut(playerCount(ff))}</p>
              </Card>
            </>
          ) : (
            <Card title={t.me.signup} i={1} className="lg:col-span-2">
              <p className="text-paper/80">{t.me.notInLate}</p>
            </Card>
          ))}
        {placementCard()}
        {team ? (
          <TeamCard t={t} team={team} me={me} seeds={seeds} i={2} />
        ) : (
          qp && (
            <Card title={t.me.team} i={2}>
              <p className="text-ash">{noTeam}</p>
            </Card>
          )
        )}
        {qualTable}
        {earlyConn}
      </>,
    );

  const mine = matches.filter((m) => m.team1.id === team.id || m.team2.id === team.id);
  const played = mine.filter((m) => m.winner).sort((a, b) => (a.datetime ?? "").localeCompare(b.datetime ?? ""));
  const usWon = (m: Match) => wonBy(m, team.id);
  const record = recordOf(matches, team.id);
  const upcomingMatch = upcomingMatches(mine)[0];
  const lostIn = played.find((m) => (m.bracket === "losers" || m.bracket === "grand") && !usWon(m));
  const champion = finalResult(matches)?.champion === team.id;
  const path = champion ? "champion" : lostIn && !upcomingMatch ? "out" : (upcomingMatch?.bracket ?? played.at(-1)?.bracket ?? "winners");
  const pathTag = (
    <span className={cn("text-xs font-display font-bold", path === "out" ? "text-rose-hi" : path === "champion" ? "text-gold-hi" : "text-balkan-hi")}>{t.me.path[path]}</span>
  );

  const boards = await Promise.all(
    played.map((m) => scoreboardOrNull(m, teams, stages)),
  );
  const avg = (xs: number[]) => (xs.length ? xs.reduce((n, x) => n + x, 0) / xs.length : null);
  const costRows = boards.map((b) => (b ? matchCosts(b, true) : []));
  const pStats = new Map(
    team.players.map((p) => [
      p.userId,
      {
        cost: avg(costRows.flatMap((rows) => rows.filter((r) => r.id === p.userId).map((r) => r.cost))),
        acc: avg(boards.flatMap((b) => (b ? b.maps.filter((x) => !x.note).flatMap((map) => [...map.players[0], ...map.players[1]].filter((x) => x.id === p.userId && x.score > 0).map((x) => x.acc)) : []))),
      },
    ]),
  );

  const historyCard = (
    <Card title={t.me.history} i={4} className="lg:col-span-2">
      {played.length === 0 ? (
        <p className="text-sm text-ash">—</p>
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {played.toReversed().map((m, n) => (
            <MatchRow key={m.id} match={m} small label={cardLabels(ff, t, m)} delay={0.3 + n * 0.08} />
          ))}
        </div>
      )}
    </Card>
  );

  const columns = (
    <>
      <TeamCard t={t} team={team} me={me} seeds={seeds} stats={pStats} record={record} i={2} />
      {connCard(3)}
      {historyCard}
    </>
  );

  if (phase === "finished") {
    const lf = played.find((m) => m.id === getFormat().losersFinal && !usWon(m));
    const place = champion ? 0 : lostIn?.bracket === "grand" ? 1 : lf ? 2 : -1;
    return shell(
      <>
        <Card title={t.me.finish} i={1} className={cn("lg:col-span-2", place === 0 && "border-gold/40")}>
          <div className="flex items-center gap-4">
            {place === 0 && <Crown className="size-12 text-gold-hi" />}
            <span className={cn("heading-slam text-6xl", place === 0 && "text-gold-hi")}>
              {place >= 0 ? t.me.places[place] : lostIn ? t.me.outIn(roundName(t, lostIn.round)) : "—"}
            </span>
          </div>
        </Card>
        {columns}
      </>,
    );
  }

  let nextCard: React.ReactNode;
  if (team.out) {
    nextCard = (
      <Card title={t.me.path.out} i={1} className="lg:col-span-2">
        <p className="text-ash">{t.me.teamOut[team.out]}</p>
      </Card>
    );
  } else if (path === "out" && lostIn) {
    nextCard = (
      <Card title={t.me.path.out} i={1} className="lg:col-span-2">
        <p className="text-ash">{t.me.outNext(roundName(t, lostIn.round))}</p>
      </Card>
    );
  } else if (!upcomingMatch) {
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
      <Card title={t.me.next} i={1} className="lg:col-span-2">
        <div>
          <div className="in-up in-slow flex items-center justify-center gap-3" style={at(0.15)}>
            <FitLabel labels={cardLabels(getFormat(), t, m)} className="num text-sm text-paper/75 sm:text-base" />
            {live && (
              <a href={TWITCH_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-display font-bold text-rose-hi">
                <span className="size-2 animate-pulse rounded-full bg-rose" /> {t.home.live}
              </a>
            )}
          </div>
          <div className="in-up in-slow mt-1.5 flex items-center justify-center gap-1.5 text-sm font-display font-bold text-paper sm:text-base" style={at(0.2)}>
            <CalendarClock className="size-4 shrink-0 text-rose-hi" />
            <span className="num">{m.datetime ? `${fmtSofiaDay(new Date(m.datetime), locale)}, ${fmtSofiaTime(new Date(m.datetime))}` : t.common.tbd}</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-5 sm:gap-5 sm:py-6">
            <div className="in-left-far in-slow min-w-0" style={at(0.3)}>
              <Side team={team} />
            </div>
            <span className="in-slam mx-auto" style={at(0.65)}>
              <span className="relative isolate block px-2.5 py-1 sm:px-4 sm:py-2">
                <SlantBg className="bg-rose shadow-[3px_3px_0_0_var(--rose-deep)]" />
                <span className="heading-slam block text-base text-white sm:text-2xl">{t.common.vs}</span>
              </span>
            </span>
            <div className="in-right-far in-slow min-w-0" style={at(0.3)}>
              <Side team={other} flip fallback={sourceLabel(getFormat(), t, m.id, us === 1 ? 2 : 1)} />
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-x-8 border-y border-line sm:gap-x-16">
          <Info icon={Flag} k={t.me.referee} n={m.referee ?? t.common.tbd} i={0} />
          <Info icon={Video} k={t.me.stream} n={m.streamer ?? t.common.tbd} i={1} />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-5 sm:flex sm:flex-wrap sm:items-center">
          {stage?.released && (
            <span className="in-up in-slow col-span-2 grid" style={at(1.3, 0)}>
              <SlantButton href={`/mappool/${m.stage}`} tone="paper" className="justify-center px-6 py-3 text-sm sm:text-base">
                {t.me.pool} · {roundName(t, stage.title)} <ArrowRight className="size-4" />
              </SlantButton>
            </span>
          )}
          {schedule && (
            <span className="in-up in-slow grid" style={at(1.3, 1)}>
              <SlantButton href="/matches" tone="outline" className="justify-center px-4 py-2.5 sm:px-5 sm:py-3">
                {t.home.bracket}
              </SlantButton>
            </span>
          )}
          <span className="in-up in-slow grid" style={at(1.3, 2)}>
            <SlantButton href={TWITCH_URL} tone="outline" className="justify-center px-4 py-2.5 sm:px-5 sm:py-3">
              <Tv className="size-4" /> <span className="sm:hidden">Twitch</span><span className="hidden sm:inline">{t.me.watch}</span>
            </SlantButton>
          </span>
        </div>
      </Card>
    );
  }

  return shell(
    <>
      {nextCard}
      {columns}
      {!isBGCC6() && placementCard(5)}
    </>,
  );
}
