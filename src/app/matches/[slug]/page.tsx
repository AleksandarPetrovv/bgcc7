import { notFound } from "next/navigation";
import { draftAccess, getDraft } from "@/db/drafts";
import { getPoolStages } from "@/db/mappools";
import { getSkillLayouts } from "@/db/format-plan";
import { bySkill } from "@/lib/format-plan";
import { getAllMatches, getAllTeams } from "@/db/tournament";
import { getDict } from "@/lib/i18n/server";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "@/lib/format";
import { DraftRoom } from "./draft-room";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getDict();
  return { title: `${t.draft.title} · ${getFormat().name}`, robots: { index: false } };
}

export default async function DraftPage({ params }: PageProps<"/matches/[slug]">) {
  const { slug } = await params;
  const id = matchIdFromSlug(getFormat(), slug);
  const [access, draft] = await Promise.all([draftAccess(id), getDraft(id)]);
  if (!access || !draft || (!draft.open && !access.admin)) notFound();
  const [t, teams, stages, skills, all] = await Promise.all([getDict(), getAllTeams(), getPoolStages(), getSkillLayouts(), getAllMatches()]);
  const stage = stages.find((s) => s.slug === draft.stageSlug);
  if (!stage) notFound();
  const side = (tid: string | null) => {
    const x = teams.find((tm) => tm.id === tid);
    const cap = x?.players.find((p) => p.isCaptain) ?? x?.players[0];
    return { name: x?.name ?? t.common.tbd, image: x?.image ?? "", captain: cap?.username ?? "", players: x?.players.map((p) => p.username) ?? [] };
  };
  const round = t.rounds[access.match.round] ?? access.match.round;
  const firstTo = stage.firstTo ?? getFormat().firstTo;

  return (
    <DraftRoom
      slug={slug}
      matchId={id}
      match={all.find((m) => m.id === id) ?? null}
      initial={draft}
      teams={[side(access.match.team1Id), side(access.match.team2Id)]}
      pools={bySkill(stage, skills?.[stage.slug]).pools}
      title={stage.slug === access.match.stageSlug ? round : `${round} · ${t.rounds[stage.title] ?? stage.title}`}
      firstTo={firstTo}
      admin={access.admin}
      side={access.side}
    />
  );
}
