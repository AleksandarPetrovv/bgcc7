import { notFound } from "next/navigation";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { Panel } from "@/components/admin/form";
import { getPoolStages } from "@/db/mappools";
import { getFormat } from "@/db/edition";
import { getMatchRows, getTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { MatchCard } from "./match-card";
import { db } from "@/db";
import { drafts, mpLobbies, staff, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminMatches() {
  const [t, lang, viewer, rows, teams, stages, refs, live] = await Promise.all([getDict(), getLang(), getViewer(), getMatchRows(), getTeams(), getPoolStages(), refList(), liveList()]);
  if (!can(viewer?.roles, "matches")) notFound();
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const bracketStages = stages.filter((s) => s.slug !== "qualifiers");

  return (
    <>
      <PageTitle>{t.admin.menu.matches}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.matchesHelp} d={0.15} s={0.012} />
      </p>

      <div className="space-y-8">
        {bracketStages.map((s, n) => (
          <Panel key={s.slug} i={n < 3 ? n + 1 : 0} title={`${t.rounds[s.title] ?? s.title} · ${t.admin.firstToShort(s.firstTo ?? getFormat().firstTo)}`}>
            <div className="space-y-6">
              {[...new Set(rows.filter((m) => m.stageSlug === s.slug).map((m) => m.round))].map((round) => {
                const list = rows.filter((m) => m.stageSlug === s.slug && m.round === round);
                return (
                  <div key={round}>
                    <h3 className="mb-2.5 flex items-center gap-3 text-[0.7rem] font-black uppercase tracking-[0.16em] text-rose-hi">
                      {t.rounds[round] ?? round}
                      <span className="num text-ash">
                        {list.filter((m) => m.winner).length}/{list.length}
                      </span>
                      <span className="h-px flex-1 bg-line" aria-hidden />
                    </h3>
                    <div className="space-y-2">
                      {list.map((m, k) => (
                        <MatchCard key={m.id} m={m} k={k} t={t} locale={locale} teams={teams} refs={refs} pools={bracketStages.filter((x) => x.pools.length).map((x) => ({ slug: x.slug, title: t.rounds[x.title] ?? x.title }))} live={m.winner ? undefined : live.get(m.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
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
