import { pageMeta } from "@/lib/page-meta";
import { Container } from "@/components/site/page";
import { TeamGrid } from "@/components/site/team-grid";
import { getDict } from "@/lib/i18n/server";
import { requireSection } from "@/lib/authz";

export const generateMetadata = pageMeta("teams");

export default async function Teams() {
  await requireSection("teams");
  const t = await getDict();
  return (
    <Container plain>
      <TeamGrid title={t.teams.title} />
    </Container>
  );
}
