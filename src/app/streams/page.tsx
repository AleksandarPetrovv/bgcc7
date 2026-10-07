import { ExternalLink, Mic, User, Video } from "lucide-react";
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
import { MeTag, meT } from "@/components/site/me";

export default async function Streams() {
  await requireSection("streams");
  const [t, lang, matches, teams, live] = await Promise.all([getDict(), getLang(), getMatches(), getTeams(), getLive()]);
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const upcoming = matches.filter((m) => !m.winner && m.datetime && m.team1.id && m.team2.id).sort((a, b) => a.datetime!.localeCompare(b.datetime!));
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
            <TwitchEmbed title={t.streams.title} />
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
