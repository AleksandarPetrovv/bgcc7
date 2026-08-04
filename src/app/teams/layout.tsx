import { SubNav } from "@/components/site/page";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={[{ href: "/teams", label: "Team list" }, { href: "/teams/players", label: "Players" }, { href: "/teams/manage", label: "Team management" }]} />
      {children}
    </>
  );
}
