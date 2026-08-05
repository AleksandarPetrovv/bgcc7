import { Container } from "@/components/site/page";
import { TeamGrid } from "@/components/site/team-grid";
import { getDict } from "@/lib/i18n/server";

export default async function Teams() {
  const t = await getDict();
  return (
    <Container>
      <TeamGrid title={<h1 className="heading-slam text-[clamp(2rem,8.5vw,3rem)] sm:text-6xl">{t.teams.title}</h1>} />
    </Container>
  );
}
