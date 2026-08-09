import { GatedSubNav } from "@/components/site/gated-sub-nav";
import { getDict } from "@/lib/i18n/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getDict();
  return (
    <>
      <GatedSubNav items={[{ href: "/streams", label: t.sub.live }, { href: "/streams/vods", label: t.sub.vods }, { href: "/streams/overlays", label: t.sub.overlays }]} />
      {children}
    </>
  );
}
