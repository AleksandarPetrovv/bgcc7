import { SubNav } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <SubNav items={[{ href: "/qualifiers", label: t.sub.lobbies }, { href: "/qualifiers/scores", label: t.sub.scores }, { href: "/qualifiers/seeding", label: t.sub.seeding }]} />
      {children}
    </>
  );
}
