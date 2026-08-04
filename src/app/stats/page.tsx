import { Container, PageTitle, SectionHeading } from "@/components/site/page";
import { MapDifficultyChart } from "@/components/site/map-chart";
import { qualifiers, fmtNum } from "@/lib/data";

export default function Stats() {
  const perfs = qualifiers.players.flatMap((p) => Object.entries(p.perf).map(([mid, v]) => ({ ...v, mid, player: p })));
  const best = perfs.reduce((a, b) => (b.score > a.score ? b : a));
  const acc = perfs.reduce((a, b) => (b.acc > a.acc ? b : a));
  const mapBy = (id: string) => qualifiers.maps.find((m) => String(m.id) === id)!;

  const HIGHLIGHTS = [
    { k: "Highest score", v: fmtNum(best.score), who: best.player.username, map: mapBy(best.mid) },
    { k: "Best accuracy", v: `${acc.acc.toFixed(2)}%`, who: acc.player.username, map: mapBy(acc.mid) },
    { k: "Top seed", v: qualifiers.players[0].zSum.toFixed(2), who: qualifiers.players[0].username, map: null },
    { k: "Scores set", v: fmtNum(perfs.length), who: `${qualifiers.players.length} players`, map: null },
  ];

  return (
    <Container>
      <PageTitle accent="Qualifiers">Stats</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map((h, i) => (
          <div key={h.k} className={i === 0 ? "bg-rose p-5 text-white" : i === 1 ? "bg-balkan p-5 text-white" : "bg-paper p-5 text-ink"}>
            <div className="text-[0.65rem] font-black uppercase tracking-widest opacity-80">{h.k}</div>
            <div className="num mt-1 text-5xl leading-none">{h.v}</div>
            <div className="mt-2 text-sm font-bold">{h.who}</div>
            {h.map && <div className="truncate text-xs opacity-80">{h.map.slot} · {h.map.title}</div>}
          </div>
        ))}
      </div>

      <SectionHeading>Average score per map</SectionHeading>
      <div className="border border-line bg-coal p-5">
        <MapDifficultyChart />
      </div>

      <SectionHeading tone="balkan">Map leaders</SectionHeading>
      <div className="grid gap-3 md:grid-cols-2">
        {qualifiers.maps.map((m) => {
          const top = qualifiers.players
            .filter((p) => p.perf[m.id])
            .sort((a, b) => b.perf[m.id].score - a.perf[m.id].score)
            .slice(0, 3);
          return (
            <div key={m.id} className="flex items-stretch border border-line">
              <div className="relative w-28 shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.cover} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
                <span className="heading-slam relative flex h-full items-center justify-center text-3xl">{m.slot}</span>
              </div>
              <ol className="flex-1 divide-y divide-line">
                {top.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className={`num w-5 ${["text-[#e8c547]", "text-[#c9ccd1]", "text-[#c98a4b]"][i]}`}>{i + 1}</span>
                    <span className="font-bold">{p.username}</span>
                    <span className="num ml-auto text-base">{fmtNum(p.perf[m.id].score)}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
