import { SubNav } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";

export async function MeSubNav({ sched }: { sched?: boolean }) {
  const t = await getDict();
  return <SubNav items={[sched ? { href: "/scheduling", label: t.nav.scheduling } : { href: "/me", label: t.me.title }]} />;
}
