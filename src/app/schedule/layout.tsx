import { SubNav } from "@/components/site/page";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={[{ href: "/schedule", label: "Schedule" }, { href: "/schedule/bracket", label: "Bracket" }]} />
      {children}
    </>
  );
}
