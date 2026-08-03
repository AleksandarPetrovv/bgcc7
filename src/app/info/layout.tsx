import { SubNav } from "@/components/site/page";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={[{ href: "/info", label: "Information" }, { href: "/info/condensed", label: "Condensed" }]} />
      {children}
    </>
  );
}
