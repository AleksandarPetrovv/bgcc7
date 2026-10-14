import { ExternalLink, Mic, User, Video } from "lucide-react";
import { Container, PageTitle, SlantButton, SubHeading, Tag } from "@/components/site/page";
import { TwitchEmbed } from "@/components/site/twitch-embed";
import { getDict } from "@/lib/i18n/server";
import { roundName, type Dict } from "@/lib/i18n/dict";
import { TWITCH_URL } from "@/lib/links";
import { getMatches, getTeams } from "@/db/tournament";
import { getLang } from "@/lib/i18n/server";
import { fmtSofia, isFuture } from "@/lib/time";
import { Countdown } from "@/components/site/countdown";
import type { Team } from "@/lib/data";
import { getLive } from "@/lib/twitch";
import { requireSection } from "@/lib/authz";
import { MeTag, meT } from "@/components/site/me";

export default async function Streams() {
  await requireSection("streams");
  const [t, lang, matches, teams, live] = await Promise.all([getDict(), getLang(), getMatches(), getTeams(), getLive()]);
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const upcoming = matches.filter((m) => !m.winner && m.datetime && m.team1.id && m.team2.id).sort((a, b) => a.datetime!.localeCompare(b.datetime!));
  const soon = upcoming.find((m) => isFuture(new Date(m.datetime!)));
  const next = soon ? { round: roundName(t, soon.round), at: soon.datetime!, a: teamById(soon.team1.id), b: teamById(soon.team2.id) } : null;
  return (
    <Container plain>
      <PageTitle mark="glints"
        right={
          <Tag tone="paper" className="text-xs normal-case">
            {t.streams.channelTag}
          </Tag>
        }
      >
        {t.streams.title}
      </PageTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] 2xl:grid-cols-[minmax(0,1fr)_28rem] 2xl:gap-10">
        <div className="relative">
          {live?.viewers != null && (
            <span className="in-pop num absolute -top-6 right-0 flex items-center gap-1 text-sm text-rose-hi" style={{ "--d": "0.9s" } as React.CSSProperties} title={t.home.live}>
              <User className="size-4" /> {live.viewers}
            </span>
          )}
          <div className="in-wipe aspect-video overflow-hidden border border-line bg-coal" style={{ "--d": "0.15s" } as React.CSSProperties}>
            {live ? <TwitchEmbed title={t.streams.title} /> : <Offline t={t} next={next} />}
          </div>
          <div className="in-up mt-4 flex flex-wrap items-center justify-end gap-3" style={{ "--d": "0.7s" } as React.CSSProperties}>
            <SlantButton href={TWITCH_URL} tone="paper">
              {t.streams.openTwitch} <ExternalLink className="size-4" />
            </SlantButton>
          </div>
        </div>

        <div>
          <div className="in-drop" style={{ "--d": "0.25s" } as React.CSSProperties}>
            <SubHeading>{t.streams.schedule}</SubHeading>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="in-right border border-line bg-coal p-4 text-sm text-ash" style={{ "--d": "0.35s" } as React.CSSProperties}>{t.streams.noUpcoming}</p>}
            {upcoming.map((m, i) => {
              const a = teamById(m.team1.id);
              const b = teamById(m.team2.id);
              return (
                <div key={m.id} {...meT(a?.id)} className="in-right border border-line bg-coal p-3" style={{ "--i": Math.min(i, 8), "--s": "0.08s", "--d": "0.35s" } as React.CSSProperties}>
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span className="text-rose-hi">{roundName(t, m.round)}</span>
                    <span className="num text-sm text-paper">{fmtSofia(new Date(m.datetime!), lang === "bg" ? "bg-BG" : "en-GB")}</span>
                  </div>
                  <div className="mt-1 truncate font-black">
                    {a?.name}
                    <MeTag t={a?.id} /> <span className="text-rose-hi">{t.common.vs}</span> {b?.name}
                    <MeTag t={b?.id} />
                  </div>
                  {(m.streamer || m.commentators) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-ash">
                      {m.streamer && (
                        <span className="flex items-center gap-1">
                          <Video className="size-3.5" /> {m.streamer}
                        </span>
                      )}
                      {m.commentators && (
                        <span className="flex items-center gap-1">
                          <Mic className="size-3.5" /> {m.commentators}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Container>
  );
}

function Offline({ t, next }: { t: Dict; next: { round: string; at: string; a?: Team; b?: Team } | null }) {
  return (
    <div className="relative flex size-full flex-col justify-between p-5 sm:p-8">
      {next && (
        <div className="absolute inset-0 grid grid-cols-2 opacity-15 grayscale" aria-hidden>
          {[next.a, next.b].map((x, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={x?.image} alt="" className="size-full object-cover" />
          ))}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/70 to-coal/30" aria-hidden />
      <span className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ash">
        <span className="size-2 rotate-45 bg-ash" aria-hidden /> {t.streams.offline}
      </span>
      {next ? (
        <div className="relative">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-paper/70">{t.streams.nextUp}</div>
          <div className="mt-1 text-sm font-black uppercase text-rose-hi">{next.round}</div>
          <div className="heading-slam mt-2 flex flex-wrap items-baseline gap-x-3 text-[clamp(1.5rem,4vw,3rem)] leading-none">
            <span>{next.a?.name}</span>
            <span className="text-rose-hi">{t.common.vs}</span>
            <span>{next.b?.name}</span>
          </div>
          <Countdown to={next.at} />
        </div>
      ) : (
        <div className="heading-slam relative select-none text-[clamp(3rem,10vw,7rem)] leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(244,243,238,0.18)]" aria-hidden>
          {t.streams.offline}
        </div>
      )}
    </div>
  );
}
