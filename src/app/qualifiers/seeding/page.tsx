import Link from "next/link";
import { Container, PageTitle, Tag } from "@/components/site/page";
import { SeedingChart } from "@/components/site/seeding-chart";
import { getDict } from "@/lib/i18n/server";
import { fmtNum } from "@/lib/data";
import { getTeams } from "@/db/tournament";
import { cn } from "@/lib/utils";
import { requireSection } from "@/lib/authz";
import { getQualResults } from "@/db/qualifiers";
import { getSettings } from "@/db/settings";
import { getFill } from "@/db/copy";

export default async function Seeding() {
  await requireSection("seeding");
  const [t, qualifiers, settings, teams, f] = await Promise.all([getDict(), getQualResults(), getSettings(), getTeams(), getFill()]);
  return (
    <Container>
      <PageTitle mark="chevrons" right={<Tag tone="rose" className="text-xs">{t.qual.seedingTag}</Tag>}>{t.qual.seedingTitle}</PageTitle>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="in-up border border-line bg-coal p-3 sm:p-5" style={{ "--d": "0.15s" } as React.CSSProperties}>
          <div className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-ash">{f(t.qual.chartLabel)}</div>
          <SeedingChart players={qualifiers.players} cut={settings.qualifyCount} />
        </div>
        <div className="order-first space-y-2 lg:order-none">
          {teams.map((team, i) => (
            <Link key={team.id} href={`/teams/${team.id}`} style={{ "--i": i, "--s": "0.07s", "--d": "0.25s" } as React.CSSProperties} className="in-right grid grid-cols-[40px_40px_1fr_auto] items-center text-sm sm:grid-cols-[56px_48px_1fr_auto] sm:text-base border border-line bg-coal transition-colors hover:border-balkan">
              <span className={cn("in-pop num flex h-full items-center justify-center text-xl sm:text-2xl", team.seed <= 4 ? "bg-balkan text-ink" : "bg-slate text-paper")}>{team.seed}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={team.image} alt="" className="size-10 object-cover sm:size-12" />
              <span className="truncate px-3 font-black">{team.name}</span>
              <span className="num px-3 text-ash">{t.qual.avg(fmtNum(team.avgRank))}</span>
            </Link>
          ))}
          <p className="pt-2 text-xs text-ash">{t.qual.seedingNote}</p>
        </div>
      </div>
    </Container>
  );
}
