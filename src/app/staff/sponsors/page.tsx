import { Container, PageTitle, SlantButton } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { getSponsors } from "@/db/tournament";
import { getSettings } from "@/db/settings";
import { requireSection } from "@/lib/authz";

export default async function Sponsors() {
  await requireSection("sponsors");
  const [t, sponsors, settings] = await Promise.all([getDict(), getSponsors(), getSettings()]);
  return (
    <Container className="max-w-5xl">
      <PageTitle>{t.staff.sponsorsTitle}</PageTitle>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {sponsors.map((s, i) => (
          <div key={s.id} className="flex items-center gap-4 border border-line bg-coal p-4 sm:gap-5 sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.image ? <img src={s.image} alt="" className="size-16 shrink-0 object-cover sm:size-20" /> : <span className="size-16 shrink-0 bg-slate sm:size-20" />}
            <div className="min-w-0">
              <div className="truncate font-display text-xl font-bold lowercase sm:text-2xl">
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
            <span className={`num ml-auto shrink-0 text-3xl sm:text-4xl ${i % 2 ? "text-balkan" : "text-rose-hi"}`}>#{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-col items-center gap-4 border border-line bg-coal p-8 text-center">
        <div className="heading-slam text-3xl">{t.staff.backTitle}</div>
        <p className="max-w-md text-sm text-ash">{t.staff.backText}</p>
        {settings.links.donate && (
          <SlantButton tone="rose" href={settings.links.donate}>
            {t.common.donate}
          </SlantButton>
        )}
      </div>
    </Container>
  );
}
