import { MatchesView } from "../../matches-view";

/** the matches list with one match's take popup open; the #referees discord post links here */
export default async function TakeMatchPage({ params }: { params: Promise<{ slug: string }> }) {
  return <MatchesView take={(await params).slug} />;
}
