import { Container, PageTitle } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { getSponsors } from "@/db/tournament";
import { requireSection } from "@/lib/authz";
import { Avatar } from "@/components/site/avatar";
import { Stagger, StaggerItem } from "@/components/site/motion";

export default async function Sponsors() {
  await requireSection("sponsors");
  const [t, sponsors] = await Promise.all([getDict(), getSponsors()]);
  return (
    <Container>
      <PageTitle mark="glints">{t.staff.sponsorsTitle}</PageTitle>
      <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" gap={0.08}>
        {sponsors.map((s) => (
          <StaggerItem key={s.id} className="lift group flex items-center gap-4 border border-line bg-coal p-4 hover:border-paper/30 sm:gap-5 sm:p-5">
            <Avatar src={s.image} className="in-spin size-16 ring-offset-4 transition-transform duration-500 group-hover:rotate-[-4deg] group-hover:scale-105 sm:size-20" />
            <div className="min-w-0">
              <div className="truncate text-xl font-black sm:text-2xl">
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
