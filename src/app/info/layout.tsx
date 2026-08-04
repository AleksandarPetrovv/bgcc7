import { SubNav } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <SubNav items={[{ href: "/info", label: t.sub.information }, { href: "/info/condensed", label: t.sub.condensed }]} />
      {children}
    </>
  );
}
