import { Mic, Radio, Video } from "lucide-react";
import { Container, PageTitle, SubHeading, Tag } from "@/components/site/page";
import { StitchText, SpeedMark, Wordmark } from "@/components/site/graphics";
import { bracket, teamById } from "@/lib/data";

const CREW = ["Prahosnika", "Raregendary", "SynchroHD"];

export default function Streams() {
  const upcoming = bracket.winners[0].matches;
  return (
    <Container className="max-w-[1400px]">
      <PageTitle right={<Tag tone="rose" className="text-xs">Offline · next broadcast 28 Nov 16:00 EET</Tag>}>Streams</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="relative aspect-video overflow-hidden border border-line bg-coal">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            <div className="flex items-center gap-2">
              <SpeedMark className="h-12 w-36" />
              <Wordmark size="md" className="text-5xl" />
            </div>
            <div className="flex items-center gap-2 bg-rose px-3 py-1 text-sm font-black uppercase text-white">
              <Radio className="size-4" /> Stream offline
            </div>
            <p className="text-sm text-ash">The player shows up here as soon as a match goes live.</p>
          </div>
          <StitchText value="OFF AIR" className="absolute bottom-4 right-4 h-5 w-auto text-line" />
        </div>

        <div>
          <SubHeading>Broadcast schedule</SubHeading>
          <div className="space-y-2">
            {upcoming.map((m, i) => {
              const a = teamById(m.team1.id);
              const b = teamById(m.team2.id);
              return (
                <div key={m.id} className="border border-line bg-coal p-3">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span className="text-rose-hi">{m.id}</span>
                    <span className="num text-sm text-paper">{m.datetime}</span>
                  </div>
                  <div className="mt-1 truncate font-black">
                    {a?.name} <span className="text-rose-hi">vs</span> {b?.name}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-ash">
                    <span className="flex items-center gap-1"><Video className="size-3.5" /> {CREW[i % 3]}</span>
                    <span className="flex items-center gap-1"><Mic className="size-3.5" /> {CREW[(i + 1) % 3]}, {CREW[(i + 2) % 3]}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase text-ash">
            Commentary in Bulgarian
          </div>
        </div>
      </div>
    </Container>
  );
}
