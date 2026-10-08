import { GatedSubNav } from "@/components/site/gated-sub-nav";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <GatedSubNav items={[{ href: "/qualifiers", label: t.sub.lobbies }, { href: "/qualifiers/scores", label: t.sub.scores }, { href: "/qualifiers/seeding", label: t.sub.seeding }]} />
      {children}
    </>
  );
}
