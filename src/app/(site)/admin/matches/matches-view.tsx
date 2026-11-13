import { forbidden } from "next/navigation";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page-title";
import { ChevronDown } from "lucide-react";
import { SlantBg } from "@/components/site/slant";
import { RuleDiamond } from "@/components/site/rule";
import { getPoolStages } from "@/db/mappools";
import { getMatchRows, getTeams } from "@/db/tournament";
import { refScope, takeOver } from "@/lib/match-access";
import { playersOf } from "@/lib/staff-names";
import { getDict, getLang } from "@/lib/i18n/server";
import { getFormat } from "@/db/edition";
import { matchLabel } from "@/lib/matches";
import { MatchCard } from "./match-card";
import { CardSlot, TakeButton, TakeHost, type TakeInfo } from "./take-modal";
import { editLocked } from "@/lib/edit-lock";
import { Cascade } from "@/components/site/cascade";
import { db } from "@/db";
import { drafts, mpLobbies, staff, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";
import { isBracketStage } from "@/lib/format";

/** the matches list; `take` = the match whose take popup opens with the page (/admin/matches/take/<match>) */
export async function MatchesView({ take }: { take?: string }) {
  const [t, lang, scope, all, teams, stages, refs, live] = await Promise.all([getDict(), getLang(), refScope(), getMatchRows(), getTeams(), getPoolStages(), refList(), liveList()]);
  if (!scope) forbidden();
  const f = getFormat();
  const bracketStages = stages.filter((s) => isBracketStage(s.slug));
  // referees don't see matches with neither team known yet
  const rows = byDistance(all.filter((m) => bracketStages.some((s) => s.slug === m.stageSlug) && (scope.host || m.team1Id || m.team2Id)));
  const takes = new Map(await Promise.all(rows.filter((m) => !m.winner && m.startsAt && !scope.runs(m.referee)).map(async (m) => [m.id, await takeOver(db, m)] as const)));
  const locale = localeOf(lang);
  const pools = bracketStages.filter((x) => x.pools.length).map((x) => ({ slug: x.slug, title: roundName(t, x.title) }));
  const open = rows.filter((m) => !m.winner);
  const mine = open.filter((m) => scope.mine(m.referee));
  const rest = open.filter((m) => !scope.mine(m.referee));
  const sections = [
    { id: "mine", title: t.admin.matchesMine, list: mine, open: true },
    { id: "scheduled", title: t.admin.matchesScheduled, list: rest.filter((m) => m.startsAt), open: true },
    { id: "nodate", title: t.admin.matchesNoDate, list: rest.filter((m) => !m.startsAt), open: false },
    { id: "played", title: t.admin.matchesPlayed, list: rows.filter((m) => m.winner), open: false },
  ].filter((s) => s.id !== "mine" || s.list.length);
  const kindOf = (id: string, referee: string | null) => (scope.mine(referee) ? ("drop" as const) : takes.get(id)?.kind);
  const pic = (id: string | null) => teams.find((x) => x.id === id);
  const infos: TakeInfo[] = open.flatMap((m) => {
    const kind = kindOf(m.id, m.referee) ?? (m.id === take ? "gone" : null);
    if (!kind) return [];
    return [{ id: m.id, kind, label: matchLabel(f, t, m.id), teams: [m.team1Id, m.team2Id].map((id) => ({ name: pic(id)?.name ?? t.common.tbd, image: pic(id)?.image || null })), at: m.startsAt?.toISOString() ?? null, from: m.referee ?? "", lobby: takes.get(m.id)?.lobby ?? false }];
  });

  return (
    <TakeHost infos={infos} initial={take && infos.some((i) => i.id === take) ? take : undefined}>
      <PageTitle mark="swords">{t.admin.menu.matches}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.matchesHelp} d={0.15} s={0.012} />
      </p>

      <Cascade className="space-y-14" step={0.04}>
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
              <p className="pt-3 text-sm font-bold text-ash">{t.admin.matchesNone}</p>
            ) : (
              <div className={s.id === "mine" ? "relative isolate mt-8 px-5 py-8 sm:px-8" : "pt-8"}>
                {s.id === "mine" && <MinePanel />}
                {s.list.map((m, i) => {
                  const kind = m.winner ? undefined : kindOf(m.id, m.referee);
                  return (
                    <CardSlot key={m.id} id={m.id} className="relative mb-12 last:mb-0">
                      {kind && (
                        <div className="mb-2 flex justify-center">
                          <TakeButton id={m.id} kind={kind} />
                        </div>
                      )}
                      <MatchCard m={m} t={t} locale={locale} teams={teams} refs={refs} plays={[...playersOf(teams, m)]} host={scope.host} runs={scope.runs(m.referee)} locked={editLocked(scope.host ? ["host"] : [], m.startsAt?.toISOString() ?? null)} pools={pools} live={m.winner ? undefined : live.get(m.id)} />
                      {/* on the card's bottom line, under the VS */}
                      {i < s.list.length - 1 && <RuleDiamond className={s.id === "mine" ? "bg-gold" : undefined} />}
                    </CardSlot>
                  );
                })}
              </div>
            )}
          </details>
        ))}
      </Cascade>
    </TakeHost>
  );
}

/** your matches sit together on one gold-edged panel with the house hard shadow */
function MinePanel() {
  return <span className="pointer-events-none absolute inset-0 -z-10 border-2 border-gold bg-coal shadow-[8px_8px_0_0_var(--gold-deep)]" aria-hidden />;
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
