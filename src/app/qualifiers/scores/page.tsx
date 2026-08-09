import { Container, PageTitle } from "@/components/site/page";
import { ScoreMatrix } from "@/components/site/score-matrix";
import { getDict } from "@/lib/i18n/server";
import { requireSection } from "@/lib/authz";

export default async function Scores() {
  await requireSection("qualScores");
  const t = await getDict();
  return (
    <Container className="max-w-[1400px]">
      <PageTitle right={<span className="max-w-md text-sm text-ash">{t.qual.scoresHint}</span>}>{t.qual.scoresTitle}</PageTitle>
      <ScoreMatrix />
    </Container>
  );
}
