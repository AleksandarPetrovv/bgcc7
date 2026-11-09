import { db } from "@/db";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { Words } from "@/components/site/rich";
import { drafts } from "@/db/schema";
import { timers, toView } from "@/db/drafts";
import { getPoolStages, poolMaps } from "@/db/mappools";
import { getAllMatchRows, getAllTeams } from "@/db/tournament";
import { refScope } from "@/lib/match-access";
import { pickableSlots, turnOf } from "@/lib/draft";
import { getDict, getLang } from "@/lib/i18n/server";
import { fmtSofia } from "@/lib/time";
import { DraftAdmin, type DraftRow } from "./draft-admin";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";
import { getFormat } from "@/db/edition";
import { isBracketStage } from "@/lib/format";
import { matchLabel } from "@/lib/matches";

export const dynamic = "force-dynamic";

export default async function AdminDraft() {
  const [t, lang, scope, rows, teams, stages, all] = await Promise.all([
    getDict(),
    getLang(),
    refScope(),
    getAllMatchRows(),
    getAllTeams(),
    getPoolStages(),
    db.select().from(drafts),
  ]);
  const cfg = await timers();
  if (!scope) notFound();
  const locale = localeOf(lang);
  const f = getFormat();
  const team = (id: string | null) => teams.find((x) => x.id === id);
  const pools = stages.filter((s) => isBracketStage(s.slug) && s.released && s.pools.length);

  const time = (d: Date | null) => d?.getTime() ?? Infinity;
  const live = rows
    .filter((m) => scope.runs(m.referee) && m.team1Id && m.team2Id && (!m.winner || all.some((d) => d.matchId === m.id && d.open)))
    .sort((a, b) => time(a.startsAt) - time(b.startsAt) || a.order - b.order);
  const list: DraftRow[] = live.map((m) => {
    const raw = all.find((d) => d.matchId === m.id);
    const d = raw ? toView(raw, cfg) : null;
    const turn = d ? turnOf(d, raw?.rules?.slots ?? pickableSlots(poolMaps(stages, d.stageSlug))) : null;
    const a = team(m.team1Id);
    const b = team(m.team2Id);
    return {
      id: m.id,
      slug: m.id,
      round: matchLabel(f, t, m.id),
      stage: m.poolSlug ?? m.stageSlug,
      when: m.startsAt ? fmtSofia(m.startsAt, locale) : null,
      teams: [a ? { name: a.name, image: a.image } : null, b ? { name: b.name, image: b.image } : null],
      draft: d ? { open: d.open, stage: d.stageSlug, state: d.pausedAt ? "paused" : turn!.kind, steps: d.steps.length, rolled: d.roll1 != null || d.roll2 != null, paused: !!d.pausedAt } : null,
    };
  });

  return (
    <>
      <PageTitle mark="draft">{t.admin.menu.draft}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.dr.help} d={0.15} s={0.012} />
      </p>
      <DraftAdmin rows={list} pools={pools.map((p) => ({ slug: p.slug, title: roundName(t, p.title) }))} />
    </>
  );
}
