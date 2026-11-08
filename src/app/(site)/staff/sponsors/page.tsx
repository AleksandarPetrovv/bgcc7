import { pageMeta } from "@/lib/page-meta";
import { Container } from "@/components/site/page";
import { PageTitle } from "@/components/site/page-title";
import { getDict } from "@/lib/i18n/server";
import { getSponsors } from "@/db/tournament";
import { requireSection } from "@/lib/authz";
import { Pfp } from "@/components/site/pfp";
import { Stagger, StaggerItem } from "@/components/site/motion";
import { RuleDiamond } from "@/components/site/rule";

export const generateMetadata = pageMeta("sponsors");

export default async function Sponsors() {
  await requireSection("sponsors");
  const [t, sponsors] = await Promise.all([getDict(), getSponsors()]);
  return (
    <Container>
      <PageTitle mark="glints">{t.staff.sponsorsTitle}</PageTitle>
      <Stagger className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3" gap={0.08}>
        {sponsors.map((s) => (
          <StaggerItem key={s.id} className="group relative flex items-center gap-4 border-b-2 border-dashed border-line py-4 transition-colors hover:border-paper/30 sm:gap-5 sm:py-5">
            <RuleDiamond />
            <Pfp src={s.image} className="in-spin size-16 ring-offset-4 transition-transform duration-500 group-hover:rotate-[-4deg] group-hover:scale-105 sm:size-20" />
            <div className="min-w-0">
              <div className="truncate text-xl font-display font-black sm:text-2xl">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-rose-hi">
                    {s.name}
                  </a>
                ) : (
                  s.name
                )}
              </div>
              <div className="text-sm text-ash">{t.staff.donor}</div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </Container>
  );
}
