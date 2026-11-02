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
      { href: "/qualifiers", section: "lobbies", label: (t) => t.sub.lobbies },
      { href: "/qualifiers/scores", section: "qualScores", label: (t) => t.sub.scores },
      { href: "/qualifiers/seeding", section: "seeding", label: (t) => t.sub.seeding },
    ],
  },
];
