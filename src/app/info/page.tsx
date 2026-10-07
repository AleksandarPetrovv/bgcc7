import { Container, SectionHeading, SlantButton, PageTitle } from "@/components/site/page";
import { Rich, Words } from "@/components/site/rich";
import { InView } from "@/components/site/in-view";
import { getDict } from "@/lib/i18n/server";
import { DISCORD_URL } from "@/lib/links";
import { getFill } from "@/db/copy";
import { requireSection } from "@/lib/authz";

const v = (o: Record<string, string | number>) => o as React.CSSProperties;

function List({ items }: { items: string[] }) {
  return (
    <InView as="ul" className="ml-5 list-disc space-y-2 text-[0.97rem] leading-relaxed marker:text-rose">
      {items.map((item, i) => (
        <li key={item} className="in-left" style={v({ "--i": i, "--s": "0.07s", "--d": "0.1s" })}>
          <Rich text={item} />
        </li>
      ))}
    </InView>
  );
}

const PRIZE_BAR = ["bg-[#e8c547]", "bg-[#c9ccd1]", "bg-[#c98a4b]"];

export default async function InfoPage() {
  await requireSection("info");
  const [t, f] = await Promise.all([getDict(), getFill()]);
  return (
    <Container plain>
      <PageTitle mark="bubble">{t.nav.info}</PageTitle>
      <div className="in-up border border-line bg-coal/80 px-6 py-8 sm:px-10" style={v({ "--d": "0.1s" })}>
        <p className="mx-auto max-w-3xl text-center leading-relaxed text-paper/90">
          <Words text={f(t.info.intro)} d={0.3} s={0.014} />
        </p>
        <div className="mt-6 flex justify-center">
          <span className="in-pop inline-flex" style={v({ "--d": "1.1s" })}>
            <SlantButton tone="balkan" href={DISCORD_URL} className="justify-center">{t.common.discord}</SlantButton>
          </span>
        </div>

        <div className="mt-14 xl:grid xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-16">
        <div>
        <SectionHeading>{t.info.general}</SectionHeading>
        <List items={t.info.generalItems} />

        <SectionHeading>{t.info.regTitle}</SectionHeading>
        <List items={t.info.regItems.map(f)} />

        <SectionHeading>{t.info.qualTitle}</SectionHeading>
        <List items={t.info.qualItems.map(f)} />

        <SectionHeading>{t.info.procedure}</SectionHeading>
        <List items={t.info.procItems} />
        </div>

        <div className="mt-14 xl:mt-0">
        <SectionHeading>{t.info.prizes}</SectionHeading>
        <InView className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {t.info.prizeRows.map((p, i) => (
            <div key={p.place} className="in-flip border border-line bg-slate/50" style={v({ "--i": i, "--s": "0.13s", "--d": "0.1s" })}>
              <div className={`in-grow h-1.5 ${PRIZE_BAR[i]}`} style={v({ "--i": i, "--s": "0.13s", "--d": "0.45s" })} />
              <div className="p-4">
                <div className="in-pop heading-slam origin-left text-4xl" style={v({ "--i": i, "--s": "0.13s", "--d": "0.4s" })}>{p.place}</div>
                <div className="mt-2 font-bold">{p.reward}</div>
                <div className="text-sm text-ash">{p.extra}</div>
              </div>
            </div>
          ))}
        </InView>

        <SectionHeading>{t.info.structure}</SectionHeading>
        <InView className="overflow-hidden border border-line">
          {t.info.formatRows.map((r, i) => (
            <div key={r.stage} className={`in-left grid grid-cols-[1.2fr_1.5fr_1fr] items-center gap-3 px-4 py-3 ${i % 2 ? "bg-slate/60" : ""}`} style={v({ "--i": i, "--s": "0.09s" })}>
              <span className="font-black uppercase">{r.stage}</span>
              <span className="text-paper/80">{f(r.format)}</span>
              <span className="in-wipe num text-right text-lg text-rose-hi" style={v({ "--i": i, "--s": "0.09s", "--d": "0.3s" })}>{f(r.when)}</span>
            </div>
          ))}
        </InView>
        </div>
        </div>
      </div>
    </Container>
  );
}
