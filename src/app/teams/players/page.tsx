import { User } from "lucide-react";
import { Container, PageTitle, Tag } from "@/components/site/page";
import { Rhombus } from "@/components/site/graphics";
import { Cascade } from "@/components/site/cascade";
import { getDict } from "@/lib/i18n/server";
import { fmtNum, flagUrl } from "@/lib/data";
import { osuUser } from "@/lib/links";
import { requireSection } from "@/lib/authz";
import { getRegistrations } from "@/db/registrations";
import { getSettings } from "@/db/settings";
import { getMatches, getTeams } from "@/db/tournament";
import { Avatar } from "@/components/site/avatar";

const v = (o: Record<string, string | number>) => o as React.CSSProperties;

export default async function Players() {
  await requireSection("players");
  const [t, rows, settings, teams, matches] = await Promise.all([getDict(), getRegistrations(), getSettings(), getTeams(), getMatches()]);
  const playoffs = settings.phase === "playoffs" || settings.phase === "finished";
  const losses = new Map<string, number>();
  for (const m of matches) {
    if (!m.winner) continue;
    const loser = m.winner === 1 ? m.team2.id : m.team1.id;
    if (loser) losses.set(loser, (losses.get(loser) ?? 0) + 1);
  }
  const alive = new Set(teams.filter((tm) => (losses.get(tm.id) ?? 0) < 2).flatMap((tm) => tm.players.map((p) => p.userId)));
  const players = rows.filter((p) => p.status !== "denied" && (!playoffs || alive.has(p.osuId)));
  return (
    <Container plain>
      <PageTitle
        mark="people"
        right={
          <span className="flex items-center gap-1.5 text-balkan" title={t.common.players(players.length)}>
            <span className="num text-2xl">{players.length}</span>
            <User className="size-5" strokeWidth={2.75} />
          </span>
        }
      >
        {t.teams.playersTitle}
      </PageTitle>
      {playoffs && <p className="-mt-3 mb-6 text-sm font-bold text-ash">{t.teams.playersAlive}</p>}
      {players.length === 0 && <p className="py-10 text-center text-ash">{t.teams.playersEmpty}</p>}
      <Cascade className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" step={0.045}>
        {players.map((p, i) => (
          <a
            data-cascade
            key={p.osuId}
            href={osuUser(p.osuId)}
            target="_blank"
            rel="noreferrer"
            className="iv iv-self in-up lift group relative flex items-center gap-3.5 overflow-hidden border border-line bg-gradient-to-br from-coal to-ink/60 py-3 pl-3.5 pr-4 [--lift:var(--color-balkan)] hover:border-balkan/60"
          >
            <span className="heading-slam pointer-events-none absolute -bottom-3 right-2 select-none text-6xl leading-none text-transparent [-webkit-text-stroke:1px_rgba(244,243,238,0.07)] transition-colors duration-300 group-hover:[-webkit-text-stroke:1px_rgba(15,160,106,0.25)]" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-balkan transition-transform duration-300 group-hover:scale-y-100" aria-hidden />
            <span className="in-spin shrink-0" style={v({ "--d": "0.12s" })}>
              <Avatar src={p.avatarUrl} className="size-12 transition-transform duration-300 group-hover:scale-105" />
            </span>
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.country && <img src={flagUrl(p.country)} alt="" className="h-3 shrink-0" />}
                <span className="in-wipe truncate text-[1.05rem] font-black transition-colors group-hover:text-balkan" style={v({ "--d": "0.25s" })}>
                  {p.username}
                </span>
                {p.status === "pending" && (
                  <Tag tone="paper" className="in-pop ml-auto shrink-0 [--d:0.4s]">
                    {t.status.pending}
                  </Tag>
                )}
              </div>
              <div className="in-up num mt-1.5 flex items-center gap-2.5 text-sm" style={v({ "--d": "0.35s" })}>
                {p.rank !== null && <span className="text-paper">#{fmtNum(p.rank)}</span>}
                {p.countryRank !== null && (
                  <>
                    <Rhombus className="size-1 text-line" />
                    <span className="text-balkan/90">
                      {p.country} #{p.countryRank}
                    </span>
                  </>
                )}
                {p.pp !== null && (
                  <>
                    <Rhombus className="size-1 text-line" />
                    <span className="text-ash">{fmtNum(Math.round(p.pp))}pp</span>
                  </>
                )}
              </div>
            </div>
          </a>
        ))}
      </Cascade>
    </Container>
  );
}
