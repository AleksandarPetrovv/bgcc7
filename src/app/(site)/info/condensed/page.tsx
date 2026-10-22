import { Container, PageTitle } from "@/components/site/page";
import { Words } from "@/components/site/rich";
import { getDict, getLang } from "@/lib/i18n/server";
import { getFill } from "@/db/copy";
import { isBGCC6 } from "@/db";
import { getInfoCopy } from "@/db/info-copy";
import { getViewer, requireSection } from "@/lib/authz";
import { Editable } from "../editable";
import { CondensedFolk } from "../folk";
import { getPlan } from "@/db/format-plan";
import { getMatches } from "@/db/tournament";
import { getHosts } from "@/db/admin";

export default async function Condensed() {
  await requireSection("info");
  const [t, f, copy, lang, viewer] = await Promise.all([getDict(), getFill(), getInfoCopy(), getLang(), getViewer()]);
  const on = !isBGCC6() && !!viewer?.roles.includes("host");
  const raw = (path: string, fallback: string) => copy[`${lang}:${path}`] ?? fallback;
  const title = raw("info.condensed", t.info.condensed);
  if (!isBGCC6()) {
    const [plan, matches, hosts] = await Promise.all([getPlan(), getMatches(), getHosts()]);
    return (
      <Container plain>
        <CondensedFolk t={t} f={f} raw={raw} on={on} locale={lang === "bg" ? "bg-BG" : "en-GB"} plan={plan} matches={matches} hosts={hosts} />
      </Container>
    );
  }
  return (
    <Container plain>
      <PageTitle mark="bubble">
        <Editable path="info.condensed" raw={title} on={on}>
          {title}
        </Editable>
      </PageTitle>
      <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
        {t.info.facts.map(([k0, v0], i) => {
          const k = raw(`info.facts.${i}.0`, k0);
          const v = raw(`info.facts.${i}.1`, v0);
          return (
            <div key={i} className="in-flip bg-coal p-5 xl:px-8 xl:py-10" style={{ "--i": i, "--s": "0.07s", "--d": "0.15s" } as React.CSSProperties}>
              <div className="in-wipe text-[0.65rem] font-black uppercase tracking-[0.14em] text-rose-hi" style={{ "--i": i, "--s": "0.07s", "--d": "0.35s" } as React.CSSProperties}>
                <Editable path={`info.facts.${i}.0`} raw={k} on={on}>
                  {k}
                </Editable>
              </div>
              <div className="heading-slam mt-2 text-2xl normal-case xl:text-4xl">
                <Editable path={`info.facts.${i}.1`} raw={v} on={on}>
                  <Words text={f(v)} d={0.45 + i * 0.07} s={0.05} />
                </Editable>
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
