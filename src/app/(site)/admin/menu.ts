import type { Perm } from "@/lib/roles";
import { menuBGCC6 } from "./menu-bgcc6";

export const adminMenu = (): { href: string; perm: Perm[] }[] => [
  { href: "/admin/refapp", perm: ["matches", "overlay"] },
  { href: "/admin/phase", perm: ["phase"] },
  { href: "/admin/screening", perm: ["screening"] },
  ...menuBGCC6(),
  { href: "/admin/mappools", perm: ["mappools"] },
  { href: "/admin/teams", perm: ["teams"] },
  { href: "/admin/matches", perm: ["matches"] },
  { href: "/admin/scheduling", perm: ["matches"] },
  { href: "/admin/draft", perm: ["draft"] },
  { href: "/admin/stream", perm: ["stream"] },
  { href: "/admin/overlay", perm: ["overlay"] },
  { href: "/admin/site", perm: ["phase"] },
  { href: "/admin/staff", perm: ["staff"] },
  { href: "/admin/log", perm: ["log"] },
  { href: "/admin/settings", perm: ["settings"] },
  { href: "/admin/format", perm: ["format"] },
];
