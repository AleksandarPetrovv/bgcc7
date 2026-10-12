import { Container, SectionHeading, SlantButton, PageTitle } from "@/components/site/page";
import { Rich, Words } from "@/components/site/rich";
import { InView } from "@/components/site/in-view";
import { getDict } from "@/lib/i18n/server";
import { DISCORD_URL } from "@/lib/links";
import { getFill } from "@/db/copy";
import { getViewer, requireSection } from "@/lib/authz";
import { currentEdition } from "@/db";
import { getInfoCopy } from "@/db/info-copy";
import { getLang } from "@/lib/i18n/server";
import { Editable } from "./editable";

const v = (o: Record<string, string | number>) => o as React.CSSProperties;

type Ed = (path: string, fallback: string) => { raw: string; path: string };

function List({ path, items, ed, f, on }: { path: string; items: string[]; ed: Ed; f: (s: string) => string; on: boolean }) {
  return (
    <InView as="ul" className="ml-5 list-disc space-y-2 text-[0.97rem] leading-relaxed marker:text-rose">
      {items.map((item, i) => {
        const e = ed(`${path}.${i}`, item);
        return (
          <li key={i} className="in-left" style={v({ "--i": i, "--s": "0.07s", "--d": "0.1s" })}>
            <Editable path={e.path} raw={e.raw} on={on}>
              <Rich text={f(e.raw)} />
            </Editable>
          </li>
        );
      })}
    </InView>
  );
}

const PRIZE_BAR = ["bg-gold", "bg-silver", "bg-bronze"];

export default async function InfoPage() {
  await requireSection("info");
  const [t, f, copy, lang, viewer] = await Promise.all([getDict(), getFill(), getInfoCopy(), getLang(), getViewer()]);
  const on = currentEdition() === "bgcc7" && !!viewer?.roles.includes("host");
  const ed: Ed = (path, fallback) => ({ path, raw: copy[`${lang}:${path}`] ?? fallback });
  const E = (path: string, value: string, fill = true) => {
    const e = ed(path, value);
    return (
      <Editable path={e.path} raw={e.raw} on={on}>
        {fill ? f(e.raw) : e.raw}
      </Editable>
    );
  };
  const intro = ed("info.intro", t.info.intro);
  return (
    <Container plain>
      <PageTitle mark="bubble">{t.nav.info}</PageTitle>
      <div className="in-up border border-line bg-coal/80 px-6 py-8 sm:px-10" style={v({ "--d": "0.1s" })}>
        <p className="mx-auto max-w-3xl text-center leading-relaxed text-paper/90">
          <Editable path={intro.path} raw={intro.raw} on={on}>
            <Words text={f(intro.raw)} d={0.3} s={0.014} />
          </Editable>
        </p>
        <div className="mt-6 flex justify-center">
          <span className="in-pop inline-flex" style={v({ "--d": "1.1s" })}>
            <SlantButton tone="balkan" href={DISCORD_URL} className="justify-center">{t.common.discord}</SlantButton>
          </span>
        </div>

        <div className="mt-14 xl:grid xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-16">
        <div>
        <SectionHeading>{E("info.general", t.info.general)}</SectionHeading>
        <List path="info.generalItems" items={t.info.generalItems} ed={ed} f={f} on={on} />

        <SectionHeading>{E("info.regTitle", t.info.regTitle)}</SectionHeading>
        <List path="info.regItems" items={t.info.regItems} ed={ed} f={f} on={on} />

        <SectionHeading>{E("info.qualTitle", t.info.qualTitle)}</SectionHeading>
        <List path="info.qualItems" items={t.info.qualItems} ed={ed} f={f} on={on} />

        <SectionHeading>{E("info.procedure", t.info.procedure)}</SectionHeading>
        <List path="info.procItems" items={t.info.procItems} ed={ed} f={(x) => x} on={on} />
        </div>

        <div className="mt-14 xl:mt-0">
        <SectionHeading>{E("info.prizes", t.info.prizes)}</SectionHeading>
        <InView className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {t.info.prizeRows.map((p, i) => (
            <div key={p.place} className="in-flip border border-line bg-slate/50" style={v({ "--i": i, "--s": "0.13s", "--d": "0.1s" })}>
              <div className={`in-grow h-1.5 ${PRIZE_BAR[i]}`} style={v({ "--i": i, "--s": "0.13s", "--d": "0.45s" })} />
              <div className="p-4">
                <div className="in-pop heading-slam origin-left text-4xl" style={v({ "--i": i, "--s": "0.13s", "--d": "0.4s" })}>{E(`info.prizeRows.${i}.place`, p.place, false)}</div>
                <div className="mt-2 font-bold">{E(`info.prizeRows.${i}.reward`, p.reward, false)}</div>
                <div className="text-sm text-ash">{E(`info.prizeRows.${i}.extra`, p.extra, false)}</div>
              </div>
            </div>
          ))}
        </InView>

        <SectionHeading>{E("info.structure", t.info.structure)}</SectionHeading>
        <InView className="overflow-hidden border border-line">
          {t.info.formatRows.map((r, i) => (
            <div key={r.stage} className={`in-left grid grid-cols-[1.2fr_1.5fr_1fr] items-center gap-3 px-4 py-3 ${i % 2 ? "bg-slate/60" : ""}`} style={v({ "--i": i, "--s": "0.09s" })}>
              <span className="font-black uppercase">{E(`info.formatRows.${i}.stage`, r.stage, false)}</span>
              <span className="text-paper/80">{E(`info.formatRows.${i}.format`, r.format)}</span>
              <span className="in-wipe num text-right text-lg text-rose-hi" style={v({ "--i": i, "--s": "0.09s", "--d": "0.3s" })}>{E(`info.formatRows.${i}.when`, r.when)}</span>
            </div>
          ))}
        </InView>
        </div>
        </div>
      </div>
    </Container>
  );
}
