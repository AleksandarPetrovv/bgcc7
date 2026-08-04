import { SubNav } from "@/components/site/page";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <SubNav items={[{ href: "/streams", label: t.sub.live }, { href: "/streams/vods", label: t.sub.vods }, { href: "/streams/overlays", label: t.sub.overlays }]} />
      {children}
    </>
  );
}
