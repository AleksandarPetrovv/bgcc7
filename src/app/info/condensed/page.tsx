import { Container, PageTitle } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";
import { getFill } from "@/db/copy";
import { requireSection } from "@/lib/authz";

export default async function Condensed() {
  await requireSection("info");
  const [t, f] = await Promise.all([getDict(), getFill()]);
  return (
    <Container className="max-w-5xl">
      <PageTitle>{t.info.condensed}</PageTitle>
      <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
        {t.info.facts.map(([k, v]) => (
          <div key={k} className="bg-coal p-5">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-rose-hi">{k}</div>
            <div className="heading-slam mt-2 text-2xl normal-case">{f(v)}</div>
          </div>
        ))}
      </div>
    </Container>
  );
}
