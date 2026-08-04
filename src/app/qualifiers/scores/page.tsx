import { Container, PageTitle } from "@/components/site/page";
import { ScoreMatrix } from "@/components/site/score-matrix";

export default function Scores() {
  return (
    <Container className="max-w-[1400px]">
      <PageTitle right={<span className="text-sm text-ash">Hover any score to see the full play. Gold, silver and bronze are the top three on each map.</span>}>
        Qualifier scores
      </PageTitle>
      <ScoreMatrix />
    </Container>
  );
}
