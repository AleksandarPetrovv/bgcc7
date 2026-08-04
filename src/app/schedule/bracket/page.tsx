import { Container, PageTitle } from "@/components/site/page";
import { BracketView } from "@/components/site/bracket-view";
import { getDict } from "@/lib/i18n/server";

export default async function Bracket() {
  const t = await getDict();
  return (
    <Container className="max-w-[1500px]">
      <PageTitle right={<span className="text-sm text-ash">{t.schedule.bracketHint}</span>}>{t.schedule.bracketTitle}</PageTitle>
      <BracketView />
    </Container>
  );
}
