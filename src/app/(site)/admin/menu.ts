import type { Perm } from "@/lib/roles";

export const MENU: { href: string; perm: Perm[] }[] = [
  { href: "/admin/refapp", perm: ["matches", "overlay"] },
  { href: "/admin/phase", perm: ["phase"] },
  { href: "/admin/screening", perm: ["screening"] },
  { href: "/admin/lobbies", perm: ["lobbies"] },
  { href: "/admin/qualifiers", perm: ["qualifiers"] },
  { href: "/admin/mappools", perm: ["mappools"] },
  { href: "/admin/teams", perm: ["teams"] },
  { href: "/admin/matches", perm: ["matches"] },
  { href: "/admin/draft", perm: ["draft"] },
  { href: "/admin/stream", perm: ["stream"] },
  { href: "/admin/overlay", perm: ["overlay"] },
  { href: "/admin/site", perm: ["phase"] },
  { href: "/admin/staff", perm: ["staff"] },
  { href: "/admin/log", perm: ["log"] },
  { href: "/admin/settings", perm: ["settings"] },
  { href: "/admin/format", perm: ["format"] },
];
