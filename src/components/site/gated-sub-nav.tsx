import { SubNav } from "./sub-nav";
import { getVisibility } from "@/lib/authz";
import { getDict } from "@/lib/i18n/server";
import { subNav, subNavOf } from "@/lib/sections";

export async function GatedSubNav({ base }: { base: string }) {
  const [{ sections, staff, off }, t] = await Promise.all([getVisibility(), getDict()]);
  const shown = subNav(subNavOf(base, t), sections, staff, off);
  return shown.length ? <SubNav items={shown} /> : null;
}

export const sectionLayout = (base: string) =>
  function SectionLayout({ children }: { children: React.ReactNode }) {
    return (
      <>
        <GatedSubNav base={base} />
        {children}
      </>
    );
  };
