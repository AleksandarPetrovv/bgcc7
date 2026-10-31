import { ArrowRight, CalendarClock, Crown, ExternalLink, Flag, Link2, Mic, Swords, Tv, Video } from "lucide-react";
import { Container, PageTitle, SlantButton, Tag } from "@/components/site/page";
import { Avatar } from "@/components/site/avatar";
import { Countdown } from "@/components/site/countdown";
import { currentOsuId } from "@/auth";
import { canSee } from "@/lib/authz";
import { login } from "@/app/(site)/pickems/actions";
import { getDict, getLang } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { getSettings } from "@/db/settings";
import { getRegistrations } from "@/db/registrations";
import { getLobbies, mpIds } from "@/db/lobbies";
import { getQualResults } from "@/db/qualifiers";
import { getMatches, getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getPlayerSeeds } from "@/db/seeds";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { myCaptainTeam } from "@/db/schedule";
import { discordProfile, discordReady } from "@/lib/discord";
import { Connections } from "./connections";
import { MatchRow } from "@/components/site/match-row";
import { avatarPath } from "@/lib/avatar";
import { getScoreboard } from "@/db/scoreboards";
import { fmtRange, phaseStates } from "@/lib/dates";
import { fmtSofia, fmtSofiaTime, isFuture, windowState, tzLabel } from "@/lib/time";
import { fmtNum, type Match } from "@/lib/data";
import { rankBws } from "@/lib/bws";
import { sourceLabel, isLive } from "@/lib/matches";
import { getFormat } from "@/db/edition";
import { TWITCH_URL, osuMatch } from "@/lib/links";
import { cn } from "@/lib/utils";
import { matchCosts } from "@/lib/match-cost";
import { Card, Stat, PlayerLink, TeamCard, Side, Info, label } from "./cards";
import { QualifierPlacement, QualifierScores } from "./qualifier-scores";
import { isBGCC6 } from "@/db";
import { at } from "@/components/site/rich";


export default async function Me() {
  const [t, lang, me] = await Promise.all([getDict(), getLang(), currentOsuId()]);
  if (!me)
    return (
      <Container plain>
        <PageTitle mark="me">{t.me.title}</PageTitle>
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
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const phase = settings.phase;
  const signupPhase = phase === "registration" || phase === "screening";
  const reg = regs.find((r) => r.osuId === me);
  const team = teams.find((x) => x.players.some((p) => p.userId === me));
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const fmt = (d: Date | string) => `${fmtSofia(new Date(d), locale)} ${tzLabel(new Date(d))}`;


  const shell = (children: React.ReactNode) => (
    <Container plain>
      <PageTitle mark="me">{t.me.title}</PageTitle>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:gap-8">{children}</div>
    </Container>
  );

  const states = phaseStates(settings.timeline, phase);
  const upcoming = (
    <Card title={t.me.whatsNext} i={2}>
      <ol className="space-y-1">
        {settings.timeline.map((e, i) => (
          <li
            key={e.key}
            style={at(0.3, i, 0.08)}
            className={cn(
              "in-left in-slow relative flex items-baseline gap-3 py-1.5 pl-3 font-display font-bold text-sm",
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

  const ff = getFormat();
  const ranked = !isBGCC6() ? rankBws(regs.filter((r) => r.status !== "denied")).filter((r) => r.bws !== null) : [];
  const bwsAt = ranked.findIndex((r) => r.osuId === me);
  const myBws = bwsAt >= 0 ? ranked[bwsAt] : null;
  const bwsTier = bwsAt < 0 ? 0 : bwsAt < ff.teams ? 1 : bwsAt < ff.teams * ff.teamSize ? 2 : 0;
  const bwsCard = myBws && (
    <Card title="BWS" i={0}>
      <div className="flex items-end gap-3">
        <span className="num text-6xl leading-[0.8] sm:text-7xl">#{bwsAt + 1}</span>
        <span className="pb-1 text-sm text-ash">{t.me.ofN(ranked.length)}</span>
        <Tag tone={bwsTier ? "balkan" : "rose"} className="mb-1 ml-auto text-xs">
          {bwsTier ? t.admin.tier(bwsTier) : t.me.outsideCut(ff.teams * ff.teamSize)}
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
      </>,
    );
  }

  const myQual = qual.players.findIndex((p) => p.id === me);
  const qp = myQual >= 0 ? qual.players[myQual] : null;
  const qualTable = qp && <QualifierScores t={t} maps={qual.maps} player={qp} />;

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
                  <li key={p.osuId} className={cn("flex items-center gap-2 border px-2.5 py-1.5 text-sm font-display font-bold", p.osuId === me ? "border-balkan/60 bg-balkan/10 text-balkan-hi" : "border-line bg-ink")}>
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
                  <SlantButton href="/qualifiers" tone="paper" className="px-8 py-4 text-xl shadow-[4px_4px_0_0_var(--rose-deep)]">
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

  const placementCard = (i = 1) => qp && <QualifierPlacement t={t} placement={myQual} total={qual.players.length} cut={settings.qualifyCount} i={i} />;

  if (phase === "seeding" || !team)
    return shell(
      <>
        {!qp && !team &&
          (myBws ? (
            <>
              {bwsCard}
              <Card title={t.me.team} i={1}>
                <p className="text-ash">{bwsTier ? t.me.noTeam : t.me.outsideCut(ff.teams * ff.teamSize)}</p>
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
              <p className="text-ash">{t.me.noTeam}</p>
            </Card>
          )
        )}
        {qualTable}
      </>,
    );

  const dcRow =
    discordReady() && (await myCaptainTeam(me))
      ? await db
          .select({ id: users.discordId, name: users.discordName })
          .from(users)
          .where(eq(users.osuId, me))
          .limit(1)
          .then((r) => r[0] ?? { id: null, name: null })
          .catch(() => ({ id: null, name: null }))
      : null;
  const dcProfile = dcRow?.id ? await discordProfile(dcRow.id) : null;
  const discord = dcRow ? { name: dcRow.id ? (dcProfile?.name ?? dcRow.name ?? dcRow.id) : null, avatar: dcProfile?.avatar ?? null } : undefined;
  const mine = matches.filter((m) => m.team1.id === team.id || m.team2.id === team.id);
  const played = mine.filter((m) => m.winner).sort((a, b) => (a.datetime ?? "").localeCompare(b.datetime ?? ""));
  const usWon = (m: Match) => (m.team1.id === team.id ? m.winner === 1 : m.winner === 2);
  const record: [number, number] = [played.filter(usWon).length, played.filter((m) => !usWon(m)).length];
  const upcomingMatch = mine.filter((m) => !m.winner).sort((a, b) => (a.datetime ?? "9").localeCompare(b.datetime ?? "9"))[0];
  const lostIn = played.find((m) => (m.bracket === "losers" || m.bracket === "grand") && !usWon(m));
  const lastGf = played.find((m) => m.id === "GF-M2") ?? played.find((m) => m.id === "GF-M1");
  const champion = !!lastGf && usWon(lastGf) && !upcomingMatch;
  const path = champion ? "champion" : lostIn && !upcomingMatch ? "out" : (upcomingMatch?.bracket ?? played.at(-1)?.bracket ?? "winners");
  const pathTag = (
    <span className={cn("text-xs font-display font-bold", path === "out" ? "text-rose-hi" : path === "champion" ? "text-gold-hi" : "text-balkan-hi")}>{t.me.path[path]}</span>
  );

  const boards = await Promise.all(
    played.map((m) => Promise.race([getScoreboard(m, teams, stages), new Promise<null>((r) => setTimeout(() => r(null), 5000))]).catch(() => null)),
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
    <Card title={t.me.history} i={4} flush icon={<Swords className="size-3.5 text-rose" />} className="mx-auto w-full max-w-4xl lg:col-span-2">
      {played.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ash">—</p>
      ) : (
        <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          {played.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      )}
    </Card>
  );

  const columns = (
    <>
      <TeamCard t={t} team={team} me={me} seeds={seeds} stats={pStats} record={record} i={2} />
      <Card title={t.me.connections} i={3} icon={<Link2 className="size-3.5 text-rose" />} className="flex flex-col self-stretch" body="flex-1">
        <Connections osu={{ id: me, name: team.players.find((p) => p.userId === me)?.username ?? String(me), avatar: avatarPath(me) }} discord={discord} />
      </Card>
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
        <div className="px-4 sm:px-5">
          <div className="in-up in-slow flex items-center gap-3" style={at(0.15)}>
            <span className="text-xs font-display font-bold text-rose-hi">{roundName(t, m.round)}</span>
            {live && (
              <a href={TWITCH_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-display font-bold text-rose-hi">
                <span className="size-2 animate-pulse rounded-full bg-rose" /> {t.home.live}
              </a>
            )}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-5 sm:gap-5 sm:py-6">
            <div className="in-left-far in-slow min-w-0" style={at(0.3)}>
              <Side team={team} />
            </div>
            <span className="in-slam mx-auto" style={at(0.65)}>
              <span className="block -skew-x-12 bg-rose px-2.5 py-1 shadow-[3px_3px_0_0_var(--rose-deep)] sm:px-4 sm:py-2">
                <span className="heading-slam block skew-x-12 text-base text-white sm:text-2xl">{t.common.vs}</span>
              </span>
            </span>
            <div className="in-right-far in-slow min-w-0" style={at(0.3)}>
              <Side team={other} flip fallback={sourceLabel(getFormat(), t, matches, m.id, us === 1 ? 2 : 1)} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-y border-line bg-ink sm:grid-cols-4 sm:divide-x sm:divide-line">
          <Info icon={CalendarClock} k={t.me.when} n={m.datetime ? fmt(m.datetime) : t.common.tbd} i={0} />
          <Info icon={Flag} k={t.me.referee} n={m.referee ?? t.common.tbd} i={1} />
          <Info icon={Video} k={t.me.stream} n={m.streamer ?? t.common.tbd} i={2} />
          <Info icon={Mic} k={t.me.casters} n={m.commentators ?? t.common.tbd} i={3} />
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:flex sm:flex-wrap sm:items-center sm:p-5">
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
      {placementCard(5)}
    </>,
  );
}
