import { notFound } from "next/navigation";
import { draftAccess, getDraft } from "@/db/drafts";
import { getPoolStages } from "@/db/mappools";
import { getTeams } from "@/db/tournament";
import { getDict } from "@/lib/i18n/server";
import { matchIdFromSlug } from "@/lib/matches";
import { DraftRoom } from "./draft-room";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getDict();
  return { title: `${t.draft.title} · BGCC7`, robots: { index: false } };
}

export default async function DraftPage({ params }: PageProps<"/matches/[slug]">) {
  const { slug } = await params;
  const id = matchIdFromSlug(slug);
  const [access, draft] = await Promise.all([draftAccess(id), getDraft(id)]);
  if (!access || !draft || (!draft.open && !access.admin)) notFound();
  const [t, teams, stages] = await Promise.all([getDict(), getTeams(), getPoolStages()]);
  const stage = stages.find((s) => s.slug === draft.stageSlug);
  if (!stage) notFound();
  const side = (tid: string | null) => {
    const x = teams.find((tm) => tm.id === tid);
    const cap = x?.players.find((p) => p.isCaptain) ?? x?.players[0];
    return { name: x?.name ?? t.common.tbd, image: x?.image ?? "", captain: cap?.username ?? "", players: x?.players.map((p) => p.username) ?? [] };
  };
  const round = t.rounds[access.match.round] ?? access.match.round;
  const firstTo = stage.firstTo ?? 7;

  return (
    <DraftRoom
      slug={slug}
      matchId={id}
      initial={draft}
      teams={[side(access.match.team1Id), side(access.match.team2Id)]}
      pools={stage.pools}
      title={stage.slug === access.match.stageSlug ? round : `${round} · ${t.rounds[stage.title] ?? stage.title}`}
      firstTo={firstTo}
      admin={access.admin}
      side={access.side}
    />
  );
}
