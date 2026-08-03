import { Container, PageTitle } from "@/components/site/page";
import { ScoreMatrix } from "@/components/site/score-matrix";

export default function Scores() {
  return (
    <Container className="max-w-[1400px]">
      <PageTitle right={<span className="text-sm text-ash">Hover a score for the full play. Gold, silver and bronze mark the top 3 on each map.</span>}>
        Qualifier scores
      </PageTitle>
      <ScoreMatrix />
    </Container>
  );
}
