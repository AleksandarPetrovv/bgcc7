import type { NavGroup, Section } from "./sections";

export const ROUTES_BGCC6: [string, Section][] = [
  ["/qualifiers/scores", "qualScores"],
  ["/qualifiers/seeding", "seeding"],
  ["/qualifiers", "lobbies"],
];

export const NAV_BGCC6: NavGroup[] = [
  {
    key: "qualifiers",
    base: "/qualifiers",
    items: [
      { href: "/qualifiers", section: "lobbies" },
      { href: "/qualifiers/scores", section: "qualScores" },
      { href: "/qualifiers/seeding", section: "seeding" },
    ],
  },
];
