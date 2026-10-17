import { GatedSubNav } from "@/components/site/gated-sub-nav";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <GatedSubNav items={[{ href: "/info", label: t.sub.information }, { href: "/info/condensed", label: t.sub.condensed }]} />
      {children}
    </>
  );
}
