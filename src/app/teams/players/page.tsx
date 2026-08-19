import { Container, PageTitle, Tag } from "@/components/site/page";
import { InView } from "@/components/site/in-view";
import { getDict } from "@/lib/i18n/server";
import { fmtNum, flagUrl } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { requireSection } from "@/lib/authz";
import { getRegistrations } from "@/db/registrations";
import { Avatar } from "@/components/site/avatar";

const v = (o: Record<string, string | number>) => o as React.CSSProperties;

export default async function Players() {
  await requireSection("players");
  const [t, rows] = await Promise.all([getDict(), getRegistrations()]);
  const players = rows.filter((p) => p.status !== "denied");
  return (
    <Container plain>
      <PageTitle right={<span className="num text-2xl text-balkan">{t.common.players(players.length)}</span>}>{t.teams.playersTitle}</PageTitle>
      {players.length === 0 && <p className="py-10 text-center text-ash">{t.teams.playersEmpty}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p, i) => (
          <InView
            self
            key={p.osuId}
            className="in-up lift group flex items-stretch border border-line bg-coal [--lift:var(--color-balkan)] hover:border-balkan"
            style={v({ "--i": i < 18 ? i : i % 3, "--s": "0.035s" })}
          >
            <span className="in-drop num flex w-12 items-center justify-center bg-slate text-lg text-ash" style={v({ "--d": "0.1s" })}>
              {i + 1}
            </span>
            <span className="flex items-center pl-3">
              <span className="in-spin" style={v({ "--d": "0.12s" })}>
                <Avatar src={p.avatarUrl} className="size-11 transition-transform duration-300 group-hover:scale-105" />
              </span>
            </span>
            <div className="min-w-0 flex-1 px-3 py-2">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.country && <img src={flagUrl(p.country)} alt="" className="h-2.5" />}
                <a href={osuUser(p.osuId)} target="_blank" rel="noreferrer" className="in-wipe truncate font-black hover:text-rose-hi" style={v({ "--d": "0.25s" })}>
                  {p.username}
                </a>
                <Tag tone={p.status === "approved" ? "balkan" : "paper"} className="in-pop ml-auto [--d:0.4s]">
                  {t.status[p.status]}
                </Tag>
              </div>
              <div className="in-up num mt-1 flex gap-4 text-sm text-paper/70" style={v({ "--d": "0.35s" })}>
                {p.rank !== null && <span>#{fmtNum(p.rank)}</span>}
                {p.countryRank !== null && <span>{p.country} #{p.countryRank}</span>}
                {p.pp !== null && <span>{fmtNum(Math.round(p.pp))}pp</span>}
              </div>
            </div>
          </InView>
        ))}
      </div>
    </Container>
  );
}
