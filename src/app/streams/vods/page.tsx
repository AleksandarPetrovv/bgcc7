import { Play } from "lucide-react";
import { Container, PageTitle } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { roundName } from "@/lib/i18n/dict";
import { getMatches, getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { requireSection } from "@/lib/authz";

export default async function Vods() {
  await requireSection("streams");
  const [t, matches, teams, stages] = await Promise.all([getDict(), getMatches(), getTeams(), getPoolStages()]);
  const teamById = (id: string) => teams.find((x) => x.id === id);
  const played = matches.filter((m) => m.winner && m.vodUrl);
  const covers = stages.flatMap((s) => s.pools.flatMap((p) => p.maps.map((m) => m.cover)));
  return (
    <Container plain>
      <PageTitle mark="squiggle">{t.streams.vods}</PageTitle>
      {played.length === 0 && <p className="py-10 text-center text-ash">{t.streams.noVods}</p>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {played.map((m, i) => {
          const a = teamById(m.team1.id);
          const b = teamById(m.team2.id);
          return (
            <a key={m.id} href={m.vodUrl!} target="_blank" rel="noreferrer" className="in-up group block" style={{ "--i": Math.min(i, 9), "--s": "0.08s", "--d": "0.15s" } as React.CSSProperties}>
              <div className="relative aspect-video overflow-hidden bg-coal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={covers[i % covers.length] ?? ""} alt="" className="absolute inset-0 size-full object-cover opacity-40 transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a?.image} alt="" className="in-left size-16 border-2 border-paper object-cover" style={{ "--d": "0.35s" } as React.CSSProperties} />
                  <span className="in-pop heading-slam text-3xl text-rose-hi" style={{ "--d": "0.5s" } as React.CSSProperties}>{t.common.vs}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b?.image} alt="" className="in-right size-16 border-2 border-paper object-cover" style={{ "--d": "0.35s" } as React.CSSProperties} />
                </div>
                <span className="absolute inset-0 flex items-center justify-center bg-ink/50 opacity-0 transition group-hover:opacity-100">
                  <Play className="size-12 fill-paper text-paper" />
                </span>
              </div>
              <div className="mt-2 text-xs font-black uppercase text-rose-hi">{roundName(t, m.round)}</div>
              <div className="truncate font-black">
                {a?.name} {m.team1.score ?? 0}–{m.team2.score ?? 0} {b?.name}
              </div>
            </a>
          );
        })}
      </div>
    </Container>
  );
}
