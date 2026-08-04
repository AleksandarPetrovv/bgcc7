import { Container, PageTitle } from "@/components/site/page";
import { BracketView } from "@/components/site/bracket-view";

export default function Bracket() {
  return (
    <Container className="max-w-[1500px]">
      <PageTitle right={<span className="text-sm text-ash">Hover a match to see where its loser drops.</span>}>Bracket</PageTitle>
      <BracketView />
    </Container>
  );
}
