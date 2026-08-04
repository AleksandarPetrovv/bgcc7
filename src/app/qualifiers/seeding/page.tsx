import { Container, PageTitle, Tag } from "@/components/site/page";
import { SeedingChart } from "@/components/site/seeding-chart";
import { teams, fmtNum } from "@/lib/data";

export default function Seeding() {
  return (
    <Container>
      <PageTitle right={<Tag tone="rose" className="text-xs">Preview · based on BGCC6 results</Tag>}>Seeding</PageTitle>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-line bg-coal p-5">
          <div className="mb-3 text-xs font-black uppercase tracking-widest text-ash">Player Σ percentile · top 24</div>
          <SeedingChart />
        </div>
        <div className="space-y-2">
          {teams.map((t) => (
            <div key={t.id} className="grid grid-cols-[56px_48px_1fr_auto] items-center bg-paper text-ink">
              <span className={`num flex h-full items-center justify-center text-2xl ${t.seed <= 4 ? "bg-balkan text-white" : "bg-ink text-paper"}`}>{t.seed}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt="" className="size-12 object-cover" />
              <span className="truncate px-3 font-black">{t.name}</span>
              <span className="num px-3 text-ink/60">avg #{fmtNum(t.avgRank)}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-ash">Seeds 1 to 4 (in green) open the upper bracket against seeds 5 to 8.</p>
        </div>
      </div>
    </Container>
  );
}
