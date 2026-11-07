import { db } from "@/db";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page";
import { Words } from "@/components/site/rich";
import { drafts } from "@/db/schema";
import { timers, toView } from "@/db/drafts";
import { getPoolStages } from "@/db/mappools";
import { getAllMatchRows, getAllTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { turnOf, pickable } from "@/lib/draft";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { fmtSofia } from "@/lib/time";
import { DraftAdmin, type DraftRow } from "./draft-admin";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";

export const dynamic = "force-dynamic";

export default async function AdminDraft() {
  const [t, lang, viewer, rows, teams, stages, all] = await Promise.all([
    getDict(),
    getLang(),
    getViewer(),
    getAllMatchRows(),
    getAllTeams(),
    getPoolStages(),
    db.select().from(drafts).catch(() => []),
  ]);
  const cfg = await timers();
  if (!can(viewer?.roles, "draft")) notFound();
  const control = can(viewer?.roles, "matches");
  const locale = localeOf(lang);
  const team = (id: string | null) => teams.find((x) => x.id === id);
  const pools = stages.filter((s) => s.slug !== "qualifiers" && s.pools.length);
  const slotsOf = (slug: string) => (stages.find((s) => s.slug === slug)?.pools ?? []).flatMap((p) => p.maps.map((m) => m.slot)).filter(pickable);

  const time = (d: Date | null) => d?.getTime() ?? Infinity;
  const live = rows
    .filter((m) => m.team1Id && m.team2Id && (control ? !m.winner || all.some((d) => d.matchId === m.id && d.open) : all.some((d) => d.matchId === m.id && d.open)))
    .sort((a, b) => time(a.startsAt) - time(b.startsAt) || a.order - b.order);
  const list: DraftRow[] = live.map((m) => {
    const raw = all.find((d) => d.matchId === m.id);
    const d = raw ? toView(raw, cfg) : null;
    const turn = d ? turnOf(d, raw?.rules?.slots ?? slotsOf(d.stageSlug)) : null;
    const a = team(m.team1Id);
    const b = team(m.team2Id);
    return {
      id: m.id,
      slug: m.id,
      round: roundName(t, m.round),
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
      <DraftAdmin control={control} rows={list} pools={pools.map((p) => ({ slug: p.slug, title: roundName(t, p.title) }))} />
    </>
  );
}
