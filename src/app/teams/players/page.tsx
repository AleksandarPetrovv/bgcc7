import { Container, PageTitle, Tag } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { fmtNum, flagUrl } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { requireSection } from "@/lib/authz";
import { getRegistrations } from "@/db/registrations";

export default async function Players() {
  await requireSection("players");
  const [t, rows] = await Promise.all([getDict(), getRegistrations()]);
  const players = rows.filter((p) => p.status !== "denied");
  return (
    <Container>
      <PageTitle right={<span className="num text-2xl text-balkan">{t.common.players(players.length)}</span>}>{t.teams.playersTitle}</PageTitle>
      {players.length === 0 && <p className="py-10 text-center text-ash">{t.teams.playersEmpty}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p, i) => (
          <div key={p.osuId} className="flex items-stretch border border-line bg-coal transition hover:border-balkan">
            <span className="num flex w-12 items-center justify-center bg-slate text-lg text-ash">{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="size-16 object-cover" /> : <span className="size-16 bg-ink" />}
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
          </div>
        ))}
      </div>
    </Container>
  );
}
