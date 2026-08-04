import { SubNav } from "@/components/site/page";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={[{ href: "/streams", label: "Live" }, { href: "/streams/vods", label: "VODs" }, { href: "/streams/overlays", label: "Overlays" }]} />
      {children}
    </>
  );
}
