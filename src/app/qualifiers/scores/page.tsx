import { Container, PageTitle, Wide } from "@/components/site/page";
import { ScoreMatrix } from "@/components/site/score-matrix";
import { getDict } from "@/lib/i18n/server";
import { requireSection } from "@/lib/authz";
import { getQualResults } from "@/db/qualifiers";
import { getSettings } from "@/db/settings";

export default async function Scores() {
  await requireSection("qualScores");
  const [t, qualifiers, settings] = await Promise.all([getDict(), getQualResults(), getSettings()]);
  return (
    <Container>
      <PageTitle mark="squiggle" right={<span className="max-w-md text-sm text-ash">{t.qual.scoresHint}</span>}>{t.qual.scoresTitle}</PageTitle>
      {qualifiers.players.length ? <Wide>
          <ScoreMatrix qualifiers={qualifiers} cut={settings.qualifyCount} />
        </Wide> : <p className="py-10 text-center text-ash">{t.qual.noResults}</p>}
    </Container>
  );
}
