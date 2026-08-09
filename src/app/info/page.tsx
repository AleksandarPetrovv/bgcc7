import { Container, SectionHeading, SlantButton } from "@/components/site/page";
import { Rich } from "@/components/site/rich";
import { getDict } from "@/lib/i18n/server";
import { DISCORD_URL } from "@/lib/links";
import { requireSection } from "@/lib/authz";

function List({ items }: { items: string[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2 text-[0.97rem] leading-relaxed marker:text-rose">
      {items.map((i) => (
        <li key={i}>
          <Rich text={i} />
        </li>
      ))}
    </ul>
  );
}

const PRIZE_BAR = ["bg-[#e8c547]", "bg-[#c9ccd1]", "bg-[#c98a4b]"];

export default async function InfoPage() {
  await requireSection("info");
  const t = await getDict();
  return (
    <Container className="max-w-5xl">
      <div className="border border-line bg-coal/80 px-6 py-8 sm:px-10">
        <p className="mx-auto max-w-3xl text-center leading-relaxed text-paper/90">{t.info.intro}</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SlantButton tone="rose" className="justify-center">{t.common.donate}</SlantButton>
          <SlantButton tone="balkan" href={DISCORD_URL} className="justify-center">{t.common.discord}</SlantButton>
        </div>

        <SectionHeading>{t.info.general}</SectionHeading>
        <List items={t.info.generalItems} />

        <SectionHeading>{t.info.prizes}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {t.info.prizeRows.map((p, i) => (
            <div key={p.place} className="border border-line bg-slate/50">
              <div className={`h-1.5 ${PRIZE_BAR[i]}`} />
              <div className="p-4">
                <div className="heading-slam text-4xl">{p.place}</div>
                <div className="mt-2 font-bold">{p.reward}</div>
                <div className="text-sm text-ash">{p.extra}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionHeading>{t.info.regTitle}</SectionHeading>
        <List items={t.info.regItems} />

        <SectionHeading>{t.info.qualTitle}</SectionHeading>
        <List items={t.info.qualItems} />

        <SectionHeading>{t.info.structure}</SectionHeading>
        <div className="overflow-hidden border border-line">
          {t.info.formatRows.map((f, i) => (
            <div key={f.stage} className={`grid grid-cols-[1.2fr_1.5fr_1fr] items-center gap-3 px-4 py-3 ${i % 2 ? "bg-slate/60" : ""}`}>
              <span className="font-black uppercase">{f.stage}</span>
              <span className="text-paper/80">{f.format}</span>
              <span className="num text-right text-lg text-rose-hi">{f.when}</span>
            </div>
          ))}
        </div>

        <SectionHeading>{t.info.procedure}</SectionHeading>
        <List items={t.info.procItems} />

        <div className="mt-12 text-center text-xs font-black uppercase tracking-[0.3em] text-ash">{t.common.lastUpdated}</div>
      </div>
    </Container>
  );
}
