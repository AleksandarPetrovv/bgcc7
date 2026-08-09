import { ExternalLink, Mic, Video } from "lucide-react";
import { Container, PageTitle, SlantButton, SubHeading, Tag } from "@/components/site/page";
import { TwitchEmbed } from "@/components/site/twitch-embed";
import { getDict } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { TWITCH_URL } from "@/lib/links";
import { bracket, teamById } from "@/lib/data";
import { requireSection } from "@/lib/authz";

const CREW = ["Prahosnika", "Raregendary", "SynchroHD"];

export default async function Streams() {
  await requireSection("streams");
  const t = await getDict();
  const upcoming = bracket.winners[0].matches;
  return (
    <Container className="max-w-[1400px]">
      <PageTitle right={<Tag tone="rose" className="text-xs normal-case">{t.streams.channelTag}</Tag>}>{t.streams.title}</PageTitle>
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
            {upcoming.map((m, i) => {
              const a = teamById(m.team1.id);
              const b = teamById(m.team2.id);
              return (
                <div key={m.id} className="border border-line bg-coal p-3">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span className="text-rose-hi">{roundName(t, m.round)}</span>
                    <span className="num text-sm text-paper">{m.datetime}</span>
                  </div>
                  <div className="mt-1 truncate font-black">
                    {a?.name} <span className="text-rose-hi">{t.common.vs}</span> {b?.name}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-ash">
                    <span className="flex items-center gap-1">
                      <Video className="size-3.5" /> {CREW[i % 3]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mic className="size-3.5" /> {CREW[(i + 1) % 3]}, {CREW[(i + 2) % 3]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Container>
  );
}
