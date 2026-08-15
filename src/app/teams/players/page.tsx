import { Container, PageTitle, Tag } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { fmtNum, flagUrl } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { requireSection } from "@/lib/authz";
import { getRegistrations } from "@/db/registrations";
import { Avatar } from "@/components/site/avatar";
import { Stagger, StaggerItem } from "@/components/site/motion";

export default async function Players() {
  await requireSection("players");
  const [t, rows] = await Promise.all([getDict(), getRegistrations()]);
  const players = rows.filter((p) => p.status !== "denied");
  return (
    <Container>
      <PageTitle right={<span className="num text-2xl text-balkan">{t.common.players(players.length)}</span>}>{t.teams.playersTitle}</PageTitle>
      {players.length === 0 && <p className="py-10 text-center text-ash">{t.teams.playersEmpty}</p>}
      <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" gap={0.03}>
        {players.map((p, i) => (
          <StaggerItem key={p.osuId} className="lift group flex items-stretch border border-line bg-coal [--lift:var(--color-balkan)] hover:border-balkan">
            <span className="num flex w-12 items-center justify-center bg-slate text-lg text-ash">{i + 1}</span>
            <span className="flex items-center pl-3">
              <Avatar src={p.avatarUrl} className="size-11 transition-transform duration-300 group-hover:scale-105" />
            </span>
            <div className="min-w-0 flex-1 px-3 py-2">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.country && <img src={flagUrl(p.country)} alt="" className="h-2.5" />}
                <a href={osuUser(p.osuId)} target="_blank" rel="noreferrer" className="truncate font-black hover:text-rose-hi">
                  {p.username}
                </a>
                <Tag tone={p.status === "approved" ? "balkan" : "paper"} className="ml-auto">
                  {t.status[p.status]}
                </Tag>
              </div>
              <div className="num mt-1 flex gap-4 text-sm text-paper/70">
                {p.rank !== null && <span>#{fmtNum(p.rank)}</span>}
                {p.countryRank !== null && <span>{p.country} #{p.countryRank}</span>}
                {p.pp !== null && <span>{fmtNum(Math.round(p.pp))}pp</span>}
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </Container>
  );
}
