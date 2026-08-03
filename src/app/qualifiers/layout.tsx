import { SubNav } from "@/components/site/page";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={[{ href: "/qualifiers", label: "Lobbies" }, { href: "/qualifiers/scores", label: "Scores" }, { href: "/qualifiers/seeding", label: "Seeding" }]} />
      {children}
    </>
  );
}
