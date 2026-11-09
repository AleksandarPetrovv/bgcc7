import { notFound } from "next/navigation";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page-title";
import { ChevronDown } from "lucide-react";
import { SlantBg } from "@/components/site/slant";
import { RuleDiamond } from "@/components/site/rule";
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
  const bracketStages = stages.filter((s) => isBracketStage(s.slug));
  const rows = byDistance(all.filter((m) => scope.runs(m.referee) && bracketStages.some((s) => s.slug === m.stageSlug)));
  const locale = localeOf(lang);
  const pools = bracketStages.filter((x) => x.pools.length).map((x) => ({ slug: x.slug, title: roundName(t, x.title) }));
  const sections = [
    { id: "scheduled", title: t.admin.matchesScheduled, list: rows.filter((m) => !m.winner), open: true },
    { id: "played", title: t.admin.matchesPlayed, list: rows.filter((m) => m.winner), open: false },
  ];

  return (
    <>
      <PageTitle mark="swords">{t.admin.menu.matches}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.matchesHelp} d={0.15} s={0.012} />
      </p>

      <Cascade className="space-y-8" step={0.04}>
        {sections.map((s) => (
          <details key={s.id} data-cascade open={s.open} className="in-up group/seed">
            <summary className="group/sum flex cursor-pointer list-none items-center gap-3 border-b border-line pb-2.5 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-display font-black text-paper">{s.title}</span>
              <span className="num text-xs text-ash">{s.list.length}</span>
              <span className="relative isolate ml-auto grid size-8 shrink-0 place-items-center text-ash transition-colors group-hover/sum:text-paper group-open/seed:text-white">
                <SlantBg className="border border-line transition-colors group-hover/sum:border-paper/40 group-open/seed:border-rose group-open/seed:bg-rose" />
                <ChevronDown className="size-4 transition-transform duration-300 group-open/seed:rotate-180" aria-hidden />
              </span>
            </summary>
            {s.list.length === 0 ? (
              <p className="pt-3 text-sm font-bold text-ash">{t.admin.stream.none}</p>
            ) : (
              <div className="pt-8">
                {s.list.map((m, i) => (
                  <div key={m.id} className="relative mb-12 last:mb-0">
                    <MatchCard m={m} t={t} locale={locale} teams={teams} refs={refs} host={scope.host} pools={pools} live={m.winner ? undefined : live.get(m.id)} />
                    {/* on the card's bottom line, under the VS: mirrors the summary's side columns and chevron */}
                    {i < s.list.length - 1 && (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex gap-3 pl-4 pr-3" aria-hidden>
                        <span className="hidden w-40 shrink-0 md:block" />
                        <span className="relative flex-1">
                          <RuleDiamond />
                        </span>
                        <span className="hidden w-64 shrink-0 lg:block" />
                        <span className="w-8 shrink-0" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </details>
        ))}
      </Cascade>
    </>
  );
}

function byDistance<T extends { startsAt: Date | null }>(list: T[]) {
  const now = Date.now();
  const gap = (m: T) => (m.startsAt ? Math.abs(m.startsAt.getTime() - now) : Infinity);
  return [...list].sort((a, b) => (gap(a) === gap(b) ? 0 : gap(a) < gap(b) ? -1 : 1));
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
