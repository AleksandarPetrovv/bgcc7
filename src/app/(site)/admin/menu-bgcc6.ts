import { isBGCC6 } from "@/db";
import type { Perm } from "@/lib/roles";

export const menuBGCC6 = (): { href: string; perm: Perm[] }[] =>
  isBGCC6()
    ? [
        { href: "/admin/lobbies", perm: ["lobbies"] },
        { href: "/admin/qualifiers", perm: ["qualifiers"] },
      ]
    : [];
