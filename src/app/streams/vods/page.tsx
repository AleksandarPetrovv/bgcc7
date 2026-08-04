import { Play } from "lucide-react";
import { Container, PageTitle } from "@/components/site/page";
import { allMatches, stages, teamById } from "@/lib/data";

export default function Vods() {
  const played = allMatches.filter((m) => m.winner);
  const covers = stages.flatMap((s) => s.pools.flatMap((p) => p.maps.map((m) => m.cover)));
  return (
    <Container className="max-w-[1400px]">
      <PageTitle>VODs</PageTitle>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {played.map((m, i) => {
          const a = teamById(m.team1.id);
          const b = teamById(m.team2.id);
          return (
            <a key={m.id} href="#" className="group block">
              <div className="relative aspect-video overflow-hidden bg-coal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={covers[i % covers.length]} alt="" className="absolute inset-0 size-full object-cover opacity-40 transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a?.image} alt="" className="size-16 border-2 border-paper object-cover" />
                  <span className="heading-slam text-3xl text-rose">VS</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b?.image} alt="" className="size-16 border-2 border-paper object-cover" />
                </div>
                <span className="absolute inset-0 flex items-center justify-center bg-ink/50 opacity-0 transition group-hover:opacity-100">
                  <Play className="size-12 fill-paper text-paper" />
                </span>
                <span className="num absolute bottom-2 right-2 bg-ink px-1.5 text-sm">1:{String(12 + i * 7).padStart(2, "0")}:40</span>
              </div>
              <div className="mt-2 text-xs font-black uppercase text-rose">{m.round}</div>
              <div className="truncate font-black">
                {a?.name} {m.team1.score}–{m.team2.score} {b?.name}
              </div>
            </a>
          );
        })}
      </div>
    </Container>
  );
}
