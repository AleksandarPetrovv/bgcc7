import { Container, PageTitle } from "@/components/site/page";
import { ScoreMatrix } from "@/components/site/score-matrix";
import { getDict } from "@/lib/i18n/server";

export default async function Scores() {
  const t = await getDict();
  return (
    <Container className="max-w-[1400px]">
      <PageTitle right={<span className="max-w-md text-sm text-ash">{t.qual.scoresHint}</span>}>{t.qual.scoresTitle}</PageTitle>
      <ScoreMatrix />
    </Container>
  );
}
