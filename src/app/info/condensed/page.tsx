import { Container, PageTitle } from "@/components/site/page";
import { Words } from "@/components/site/rich";
import { getDict } from "@/lib/i18n/server";
import { getFill } from "@/db/copy";
import { requireSection } from "@/lib/authz";

export default async function Condensed() {
  await requireSection("info");
  const [t, f] = await Promise.all([getDict(), getFill()]);
  return (
    <Container plain>
      <PageTitle mark="bubble">{t.info.condensed}</PageTitle>
      <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
        {t.info.facts.map(([k, v], i) => (
          <div key={k} className="in-flip bg-coal p-5" style={{ "--i": i, "--s": "0.07s", "--d": "0.15s" } as React.CSSProperties}>
            <div className="in-wipe text-[0.65rem] font-black uppercase tracking-[0.14em] text-rose-hi" style={{ "--i": i, "--s": "0.07s", "--d": "0.35s" } as React.CSSProperties}>
              {k}
            </div>
            <div className="heading-slam mt-2 text-2xl normal-case">
              <Words text={f(v)} d={0.45 + i * 0.07} s={0.05} />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
