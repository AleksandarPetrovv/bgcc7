import { pageMeta } from "@/lib/page-meta";
import { requireSection } from "@/lib/authz";
import { Container, PageTitle } from "@/components/site/page";
import { MatchBracket } from "@/components/site/match-bracket";
import { getMatches, getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getLiveScores } from "@/db/scoreboards";
import { getDict } from "@/lib/i18n/server";

export const generateMetadata = pageMeta("matches");

export default async function Matches() {
  await requireSection("schedule");
  const [t, matches, teams, stages] = await Promise.all([getDict(), getMatches(), getTeams(), getPoolStages()]);
  const live = await getLiveScores(matches, teams, stages);
  return (
    <Container plain>
      <PageTitle mark="swords">
        {t.schedule.title}
      </PageTitle>
      <MatchBracket live={live} />
    </Container>
  );
}
