import { SubNav } from "./page";
import { getVisibility } from "@/lib/authz";
import { subNav } from "@/lib/sections";

export async function GatedSubNav({ items }: { items: { href: string; label: string }[] }) {
  const { sections, staff, off } = await getVisibility();
  const shown = subNav(items, sections, staff, off);
  return shown.length ? <SubNav items={shown} /> : null;
}
