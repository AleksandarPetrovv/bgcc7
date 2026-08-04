import { SubNav } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <SubNav items={[{ href: "/teams", label: t.sub.teamList }, { href: "/teams/players", label: t.sub.players }, { href: "/teams/manage", label: t.sub.manage }]} />
      {children}
    </>
  );
}
