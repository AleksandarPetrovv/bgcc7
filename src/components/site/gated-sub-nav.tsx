import { SubNav } from "./page";
import { getVisibility } from "@/lib/authz";
import { subNav } from "@/lib/sections";

export async function GatedSubNav({ items }: { items: { href: string; label: string }[] }) {
  const { sections, staff } = await getVisibility();
  const shown = subNav(items, sections, staff);
  return shown.length > 1 ? <SubNav items={shown} /> : null;
}
