import { notFound } from "next/navigation";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page-title";
import { Panel } from "@/components/admin/form";
import { getPoolStages } from "@/db/mappools";
import { getMatchRows, getTeams } from "@/db/tournament";
import { refScope } from "@/lib/match-access";
import { getDict, getLang } from "@/lib/i18n/server";
import { MatchCard } from "./match-card";
import { Cascade } from "@/components/site/cascade";
import { db } from "@/db";
import { drafts, mpLobbies, staff, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";
import { isBracketStage } from "@/lib/format";

export default async function AdminMatches() {
  const [t, lang, scope, all, teams, stages, refs, live] = await Promise.all([getDict(), getLang(), refScope(), getMatchRows(), getTeams(), getPoolStages(), refList(), liveList()]);
  if (!scope) notFound();
  const rows = all.filter((m) => scope.runs(m.referee));
  const locale = localeOf(lang);
  const key = (m: (typeof rows)[number]) => (m.winner ? 2e15 : 0) + (m.startsAt ? new Date(m.startsAt).getTime() : 1e15);
  const first = (list: typeof rows) => Math.min(...list.map(key));
  const bracketStages = stages.filter((s) => isBracketStage(s.slug));
  const shown = bracketStages
    .map((s) => ({ s, list: rows.filter((m) => m.stageSlug === s.slug) }))
    .filter((x) => x.list.length)
    .sort((a, b) => first(a.list) - first(b.list));

  return (
    <>
      <PageTitle mark="swords">{t.admin.menu.matches}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.matchesHelp} d={0.15} s={0.012} />
      </p>

      <Cascade className="space-y-8" step={0.04}>
        {!shown.length && <p data-cascade className="in-up text-sm font-bold text-ash">{t.admin.stream.none}</p>}
        {shown.map(({ s, list: inStage }, n) => (
          <Panel key={s.slug} i={n < 3 ? n + 1 : 0} title={`${roundName(t, s.title)} · ${t.admin.firstToShort(s.firstTo)}`}>
            <div className="space-y-6">
              {[...new Set(inStage.map((m) => m.round))]
                .map((round) => inStage.filter((m) => m.round === round).sort((a, b) => key(a) - key(b)))
                .sort((a, b) => first(a) - first(b))
                .map((list) => {
                const round = list[0].round;
                return (
                  <div key={round}>
                    <h3 data-cascade className="in-wipe mb-2.5 flex items-center gap-3 text-[0.7rem] font-display font-bold text-rose-hi">
                      {roundName(t, round)}
                      <span className="num text-ash">
                        {list.filter((m) => m.winner).length}/{list.length}
                      </span>
                      <span className="h-px flex-1 bg-line" aria-hidden />
                    </h3>
                    <div className="border-t border-line">
                      {list.map((m) => (
                        <MatchCard key={m.id} m={m} t={t} locale={locale} teams={teams} refs={refs} host={scope.host} pools={bracketStages.filter((x) => x.pools.length).map((x) => ({ slug: x.slug, title: roundName(t, x.title) }))} live={m.winner ? undefined : live.get(m.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </Cascade>
    </>
  );
}

async function refList() {
  const rows = await db
    .select({ username: users.username, roles: staff.permRoles })
    .from(staff)
    .innerJoin(users, eq(users.osuId, staff.osuId))
    .orderBy(users.username);
  const has = (r: string) => rows.filter((x) => x.roles.includes("host") || x.roles.includes(r)).map((x) => x.username);
  return { referee: has("referee"), streamer: has("streamer"), commentator: has("commentator") };
}

async function liveList() {
  const [lob, dr] = await Promise.all([db.select({ id: mpLobbies.matchId }).from(mpLobbies).where(eq(mpLobbies.open, true)), db.select({ id: drafts.matchId }).from(drafts).where(eq(drafts.open, true))]);
  const out = new Map<string, { lobby: boolean }>(dr.map((d) => [d.id, { lobby: false }]));
  for (const l of lob) out.set(l.id, { lobby: true });
  return out;
}
