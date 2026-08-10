import { ExternalLink, Mic, Video } from "lucide-react";
import { Container, PageTitle, SlantButton, SubHeading, Tag } from "@/components/site/page";
import { TwitchEmbed } from "@/components/site/twitch-embed";
import { getDict } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { TWITCH_URL } from "@/lib/links";
import { getMatches, getTeams } from "@/db/tournament";
import { getLang } from "@/lib/i18n/server";
import { fmtSofia } from "@/lib/time";
import { getLive } from "@/lib/twitch";
import { requireSection } from "@/lib/authz";

export default async function Streams() {
  await requireSection("streams");
  const [t, lang, matches, teams, live] = await Promise.all([getDict(), getLang(), getMatches(), getTeams(), getLive()]);
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const upcoming = matches.filter((m) => !m.winner && m.datetime && m.team1.id && m.team2.id).sort((a, b) => a.datetime!.localeCompare(b.datetime!));
  return (
    <Container className="max-w-[1400px]">
      <PageTitle
        right={
          <>
            {live && (
              <Tag tone="rose" className="flex items-center gap-1.5 text-xs">
                <span className="size-1.5 animate-pulse rounded-full bg-white" /> {t.home.live}
                {live.viewers !== null && <span className="num opacity-80">· {live.viewers}</span>}
              </Tag>
            )}
            <Tag tone={live ? "paper" : "rose"} className="text-xs normal-case">
              {t.streams.channelTag}
            </Tag>
          </>
        }
      >
        {t.streams.title}
      </PageTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="aspect-video overflow-hidden border border-line bg-coal">
            <TwitchEmbed title={t.streams.title} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase text-ash">{t.streams.commentary}</span>
            <SlantButton href={TWITCH_URL} tone="paper">
              {t.streams.openTwitch} <ExternalLink className="size-4" />
            </SlantButton>
          </div>
        </div>

        <div>
          <SubHeading>{t.streams.schedule}</SubHeading>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="border border-line bg-coal p-4 text-sm text-ash">{t.streams.noUpcoming}</p>}
            {upcoming.map((m) => {
              const a = teamById(m.team1.id);
              const b = teamById(m.team2.id);
              return (
                <div key={m.id} className="border border-line bg-coal p-3">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span className="text-rose-hi">{roundName(t, m.round)}</span>
                    <span className="num text-sm text-paper">{fmtSofia(new Date(m.datetime!), lang === "bg" ? "bg-BG" : "en-GB")}</span>
                  </div>
                  <div className="mt-1 truncate font-black">
                    {a?.name} <span className="text-rose-hi">{t.common.vs}</span> {b?.name}
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
