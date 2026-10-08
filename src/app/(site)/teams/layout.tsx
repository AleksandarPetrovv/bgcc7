import { GatedSubNav } from "@/components/site/gated-sub-nav";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <GatedSubNav items={[{ href: "/teams", label: t.sub.teamList }, { href: "/teams/players", label: t.sub.players }]} />
      {children}
    </>
  );
}
