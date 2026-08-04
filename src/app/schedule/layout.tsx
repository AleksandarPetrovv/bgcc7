import { SubNav } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <SubNav items={[{ href: "/schedule", label: t.sub.schedule }, { href: "/schedule/bracket", label: t.sub.bracket }]} />
      {children}
    </>
  );
}
