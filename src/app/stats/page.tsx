import { Container, PageTitle, SectionHeading } from "@/components/site/page";
import { CountUp } from "@/components/site/motion";
import { MapDifficultyChart } from "@/components/site/map-chart";
import { getDict } from "@/lib/i18n/server";
import { fmtNum } from "@/lib/data";
import { getQualResults } from "@/db/qualifiers";
import { osuUser } from "@/lib/links";
import { cn } from "@/lib/utils";
import { requireSection } from "@/lib/authz";
import { InView } from "@/components/site/in-view";

const TONES = ["bg-rose text-white", "bg-balkan text-ink", "border border-line bg-coal", "border border-line bg-coal"];
const MEDAL = ["text-[#e8c547]", "text-[#c9ccd1]", "text-[#c98a4b]"];

export default async function Stats() {
  await requireSection("stats");
  const [t, qualifiers] = await Promise.all([getDict(), getQualResults()]);
  const perfs = qualifiers.players.flatMap((p) => Object.entries(p.perf).map(([mid, v]) => ({ ...v, mid, player: p })));
  if (!perfs.length)
    return (
      <Container>
        <PageTitle mark="bars" accent={t.stats.accent}>{t.stats.title}</PageTitle>
        <p className="py-10 text-center text-ash">{t.qual.noResults}</p>
      </Container>
    );
  const best = perfs.reduce((a, b) => (b.score > a.score ? b : a));
  const acc = perfs.reduce((a, b) => (b.acc > a.acc ? b : a));
  const mapBy = (id: string) => qualifiers.maps.find((m) => String(m.id) === id)!;

  const highlights = [
    { k: t.stats.highest, n: best.score, dec: 0, suf: "", who: best.player.username, map: mapBy(best.mid) },
    { k: t.stats.bestAcc, n: acc.acc, dec: 2, suf: "%", who: acc.player.username, map: mapBy(acc.mid) },
    { k: t.stats.topSeed, n: qualifiers.players[0].zSum, dec: 2, suf: "", who: qualifiers.players[0].username, map: null },
    { k: t.stats.scoresSet, n: perfs.length, dec: 0, suf: "", who: t.common.players(qualifiers.players.length), map: null },
  ];

  return (
    <Container plain>
      <PageTitle mark="bars" accent={t.stats.accent}>{t.stats.title}</PageTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((h, i) => (
          <div key={h.k} className={cn("in-launch relative overflow-hidden p-5", TONES[i])} style={{ "--i": i, "--s": "0.16s", "--d": "0.2s" } as React.CSSProperties}>
            <span className="in-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0" style={{ "--d": "1.05s" } as React.CSSProperties} aria-hidden />
            <div className="in-wipe text-[0.65rem] font-black uppercase tracking-widest opacity-80" style={{ "--d": "0.75s" } as React.CSSProperties}>{h.k}</div>
            <CountUp to={h.n} decimals={h.dec} suffix={h.suf} delay={0.8 + i * 0.16} className="num mt-1 block text-5xl leading-none" />
            <div className="in-up mt-2 text-sm font-bold" style={{ "--d": "0.95s" } as React.CSSProperties}>{h.who}</div>
            {h.map && (
              <div className="truncate text-xs opacity-80">
                {h.map.slot} · {h.map.title}
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionHeading>{t.stats.avgPerMap}</SectionHeading>
      <InView className="border border-line bg-coal p-5">
        <MapDifficultyChart qualifiers={qualifiers} />
      </InView>

      <SectionHeading>{t.stats.mapLeaders}</SectionHeading>
      <InView className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {qualifiers.maps.map((m, k) => {
          const top = qualifiers.players
            .filter((p) => p.perf[m.id])
            .sort((a, b) => b.perf[m.id].score - a.perf[m.id].score)
            .slice(0, 3);
          return (
            <div key={m.id} className={cn("flex items-stretch border border-line bg-coal", k % 2 ? "in-right" : "in-left")} style={{ "--i": k, "--s": "0.06s" } as React.CSSProperties}>
              <div className="relative w-28 shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.cover} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
                <span className="in-pop heading-slam relative flex h-full items-center justify-center text-3xl [text-shadow:0_2px_6px_rgb(0_0_0/0.85),0_0_2px_rgb(0_0_0/0.9)]" style={{ "--d": "0.25s" } as React.CSSProperties}>{m.slot}</span>
              </div>
              <ol className="flex-1 divide-y divide-line">
                {top.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className={cn("num w-5", MEDAL[i])}>{i + 1}</span>
                    <a href={osuUser(p.id)} target="_blank" rel="noreferrer" className="font-bold hover:text-rose-hi">{p.username}</a>
                    <span className="num ml-auto text-base">{fmtNum(p.perf[m.id].score)}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </InView>
    </Container>
  );
}
