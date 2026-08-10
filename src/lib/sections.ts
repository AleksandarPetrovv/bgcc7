export const SECTIONS = [
  "info",
  "register",
  "players",
  "lobbies",
  "qualScores",
  "seeding",
  "teams",
  "mappool",
  "schedule",
  "bracket",
  "pickems",
  "stats",
  "streams",
  "staff",
  "sponsors",
] as const;
export type Section = (typeof SECTIONS)[number];

export const PHASES = ["registration", "screening", "qualifiers", "seeding", "playoffs", "finished"] as const;
export type Phase = (typeof PHASES)[number];

const early: Section[] = ["info", "register", "players", "staff", "sponsors"];
const quals: Section[] = [...early, "lobbies", "mappool", "streams"];
const seeded: Section[] = [...quals, "qualScores", "seeding", "teams", "stats"];
const playoffs: Section[] = [...seeded.filter((s) => s !== "register"), "schedule", "bracket", "pickems"];

export const PRESETS: Record<Phase, Section[]> = {
  registration: early,
  screening: early,
  qualifiers: quals,
  seeding: seeded,
  playoffs,
  finished: playoffs,
};

export const presetSections = (p: Phase) => Object.fromEntries(SECTIONS.map((s) => [s, PRESETS[p].includes(s)])) as Record<Section, boolean>;

export const TIMELINE_KEYS = ["reg", "scr", "qual", "qf", "sf", "f", "gf"] as const;

export const DEFAULT_TIMELINE = [
  { key: "reg", from: "2026-11-02", to: "2026-11-22" },
  { key: "scr", from: "2026-11-23", to: "2026-11-25" },
  { key: "qual", from: "2026-11-28", to: "2026-11-29" },
  { key: "qf", from: "2026-12-05", to: "2026-12-06" },
  { key: "sf", from: "2026-12-12", to: "2026-12-13" },
  { key: "f", from: "2026-12-19", to: "2026-12-20" },
  { key: "gf", from: "2026-12-27", to: null },
];

export const PHASE_TIMELINE: Record<Phase, string | null> = {
  registration: "reg",
  screening: "scr",
  qualifiers: "qual",
  seeding: "qual",
  playoffs: "qf",
  finished: null,
};

const ROUTES: [string, Section][] = [
  ["/info", "info"],
  ["/register", "register"],
  ["/teams/players", "players"],
  ["/teams", "teams"],
  ["/qualifiers/scores", "qualScores"],
  ["/qualifiers/seeding", "seeding"],
  ["/qualifiers", "lobbies"],
  ["/mappool", "mappool"],
  ["/schedule/bracket", "bracket"],
  ["/schedule", "schedule"],
  ["/pickems", "pickems"],
  ["/stats", "stats"],
  ["/streams", "streams"],
  ["/staff/sponsors", "sponsors"],
  ["/staff", "staff"],
];

export const sectionOf = (path: string) => ROUTES.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;

export type NavKey = "home" | "info" | "qualifiers" | "teams" | "players" | "schedule" | "mappool" | "pickems" | "stats" | "streams" | "staff";

const NAV: { key: NavKey; base: string; items: { href: string; section: Section | null; key?: NavKey }[] }[] = [
  { key: "home", base: "/", items: [{ href: "/", section: null }] },
  { key: "info", base: "/info", items: [{ href: "/info", section: "info" }] },
  {
    key: "qualifiers",
    base: "/qualifiers",
    items: [
      { href: "/qualifiers", section: "lobbies" },
      { href: "/qualifiers/scores", section: "qualScores" },
      { href: "/qualifiers/seeding", section: "seeding" },
    ],
  },
  {
    key: "teams",
    base: "/teams",
    items: [
      { href: "/teams", section: "teams" },
      { href: "/teams/players", section: "players", key: "players" },
    ],
  },
  {
    key: "schedule",
    base: "/schedule",
    items: [
      { href: "/schedule", section: "schedule" },
      { href: "/schedule/bracket", section: "bracket" },
    ],
  },
  { key: "mappool", base: "/mappool", items: [{ href: "/mappool", section: "mappool" }] },
  { key: "pickems", base: "/pickems", items: [{ href: "/pickems", section: "pickems" }] },
  { key: "stats", base: "/stats", items: [{ href: "/stats", section: "stats" }] },
  { key: "streams", base: "/streams", items: [{ href: "/streams", section: "streams" }] },
  {
    key: "staff",
    base: "/staff",
    items: [
      { href: "/staff", section: "staff" },
      { href: "/staff/sponsors", section: "sponsors" },
    ],
  },
];

export type NavItem = { key: NavKey; href: string; base: string; hidden: boolean };

export function buildNav(sections: Record<string, boolean>, staff: boolean): NavItem[] {
  const open = (s: Section | null) => s === null || !!sections[s];
  return NAV.flatMap((g) => {
    const pub = g.items.find((i) => open(i.section));
    const first = pub ?? (staff ? g.items[0] : undefined);
    if (!first) return [];
    return [{ key: first.key ?? g.key, href: first.href, base: g.base, hidden: !pub }];
  });
}

export function subNav<T extends { href: string }>(items: T[], sections: Record<string, boolean>, staff: boolean) {
  return items
    .map((i) => {
      const s = sectionOf(i.href);
      return { ...i, hidden: s !== null && !sections[s] };
    })
    .filter((i) => staff || !i.hidden);
}

export const LINK_KEYS = ["sheets", "mappack", "youtube"] as const;
