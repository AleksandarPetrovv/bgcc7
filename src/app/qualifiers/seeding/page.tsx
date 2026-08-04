import { Container, PageTitle, Tag } from "@/components/site/page";
import { SeedingChart } from "@/components/site/seeding-chart";
import { getDict } from "@/lib/i18n/server";
import { teams, fmtNum } from "@/lib/data";
import { cn } from "@/lib/utils";

export default async function Seeding() {
  const t = await getDict();
  return (
    <Container>
      <PageTitle right={<Tag tone="rose" className="text-xs">{t.qual.seedingTag}</Tag>}>{t.qual.seedingTitle}</PageTitle>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-line bg-coal p-5">
          <div className="mb-3 text-xs font-black uppercase tracking-widest text-ash">{t.qual.chartLabel}</div>
          <SeedingChart />
        </div>
        <div className="space-y-2">
          {teams.map((team) => (
            <div key={team.id} className="grid grid-cols-[56px_48px_1fr_auto] items-center border border-line bg-coal">
              <span className={cn("num flex h-full items-center justify-center text-2xl", team.seed <= 4 ? "bg-balkan text-ink" : "bg-slate text-paper")}>{team.seed}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={team.image} alt="" className="size-12 object-cover" />
              <span className="truncate px-3 font-black">{team.name}</span>
              <span className="num px-3 text-ash">{t.qual.avg(fmtNum(team.avgRank))}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-ash">{t.qual.seedingNote}</p>
        </div>
      </div>
    </Container>
  );
}
