import { notFound, redirect } from "next/navigation";
import { PreDraft } from "./pre-draft";
import { getDraft, rulesOf } from "@/db/drafts";
import { getPoolStages } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";
import { getAllMatches, getAllTeams } from "@/db/tournament";
import { getDict } from "@/lib/i18n/server";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "@/lib/format";
import { DraftRoom } from "./draft-room";
import { roundName } from "@/lib/i18n/dict";
import { draftAccess } from "@/lib/match-access";
import { poolOpen } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.draft.title, robots: { index: false } };
}

export default async function DraftPage({ params }: PageProps<"/matches/[slug]">) {
  const { slug } = await params;
  const id = matchIdFromSlug(getFormat(), slug);
  const [access, draft, teams, all] = await Promise.all([draftAccess(id), getDraft(id), getAllTeams(), getAllMatches()]);
  if (!access || !draft || (!draft.open && !access.staff)) {
    const m = all.find((x) => x.id === id);
    if (!m) notFound();
    if (m.winner) redirect(`/results/${id}`);
    const team = (tid: string) => teams.find((x) => x.id === tid);
    return <PreDraft id={id} startsAt={m.datetime} teams={[team(m.team1.id), team(m.team2.id)]} />;
  }
  const [t, stages, skills] = await Promise.all([getDict(), getPoolStages(), getSkillLayouts()]);
  const live = stages.find((s) => s.slug === draft.stageSlug);
  if (!live || !(await poolOpen(live.released))) notFound();
  const frozen = new Map((await rulesOf(id, draft.stageSlug)).maps.map((m) => [m.slot, m]));
  const stage = { ...live, pools: live.pools.map((p) => ({ ...p, maps: p.maps.map((m) => frozen.get(m.slot) ?? m) })) };
  const side = (tid: string | null) => {
    const x = teams.find((tm) => tm.id === tid);
    return { name: x?.name ?? t.common.tbd, image: x?.image ?? "" };
  };
  const round = roundName(t, access.match.round);
  const firstTo = draft.firstTo;

  return (
    <DraftRoom
      slug={slug}
      matchId={id}
      match={all.find((m) => m.id === id) ?? null}
      initial={draft}
      teams={[side(access.match.team1Id), side(access.match.team2Id)]}
      pools={bySkill(stage, skills?.[stage.slug]).pools}
      title={stage.slug === (access.match.poolSlug ?? access.match.stageSlug) ? round : `${round} · ${roundName(t, stage.title)}`}
      firstTo={firstTo}
      admin={access.admin}
      runs={access.admin}
      streams={access.streams}
      side={access.side}
      canSay={access.admin || !!access.team}
    />
  );
}
