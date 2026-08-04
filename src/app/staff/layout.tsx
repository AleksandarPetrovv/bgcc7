import { SubNav } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <SubNav items={[{ href: "/staff", label: t.sub.staff }, { href: "/staff/sponsors", label: t.sub.sponsors }]} />
      {children}
    </>
  );
}
