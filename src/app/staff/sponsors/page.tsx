import { Container, PageTitle, SlantButton } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { staff } from "@/lib/data";

export default async function Sponsors() {
  const t = await getDict();
  return (
    <Container className="max-w-5xl">
      <PageTitle>{t.staff.sponsorsTitle}</PageTitle>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {staff.sponsors.map((s, i) => (
          <div key={s.username} className="flex items-center gap-4 border border-line bg-coal p-4 sm:gap-5 sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.avatar} alt="" className="size-16 shrink-0 sm:size-20" />
            <div className="min-w-0">
              <div className="truncate font-display text-xl font-bold lowercase sm:text-2xl">{s.username}</div>
              <div className="text-sm text-ash">{t.staff.donor}</div>
            </div>
            <span className={`num ml-auto shrink-0 text-3xl sm:text-4xl ${i % 2 ? "text-balkan" : "text-rose-hi"}`}>#{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-col items-center gap-4 border border-line bg-coal p-8 text-center">
        <div className="heading-slam text-3xl">{t.staff.backTitle}</div>
        <p className="max-w-md text-sm text-ash">{t.staff.backText}</p>
        <SlantButton tone="rose">{t.common.donate}</SlantButton>
      </div>
    </Container>
  );
}
