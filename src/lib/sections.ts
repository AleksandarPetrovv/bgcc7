import { NAV_BGCC6, ROUTES_BGCC6 } from "./sections-bgcc6";
import type { Dict } from "./i18n/dict";

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
  "pickems",
  "stats",
  "streams",
  "staff",
  "sponsors",
] as const;
export type Section = (typeof SECTIONS)[number];

export const PHASES = ["registration", "screening", "qualifiers", "seeding", "playoffs", "finished"] as const;
export type Phase = (typeof PHASES)[number];

const base: Section[] = ["info", "staff", "sponsors"];
const seeded: Section[] = [...base, "players", "qualScores", "seeding", "teams", "mappool", "stats"];

const PRESETS: Record<Phase, Section[]> = {
  registration: [...base, "register", "players"],
  screening: [...base, "players"],
  qualifiers: [...base, "players", "lobbies", "mappool"],
  seeding: [...seeded, "pickems"],
  playoffs: [...seeded, "schedule", "pickems", "streams"],
  finished: [...seeded.filter((s) => s !== "players"), "schedule", "pickems", "streams"],
};

export const presetSections = (p: Phase) => Object.fromEntries(SECTIONS.map((s) => [s, PRESETS[p].includes(s)])) as Record<Section, boolean>;

/** the draw runs only in the team draw phase; screening only before the playoffs */
export const drawPhase = (p: string) => p === "seeding";
export const drawDone = (p: string) => PHASES.indexOf(p as Phase) > PHASES.indexOf("seeding");
export const screeningPhase = (p: string) => PHASES.indexOf(p as Phase) < PHASES.indexOf("playoffs");

export const TIMELINE_KEYS = ["reg", "scr", "qual", "seed", "play", "done"] as const;
export const phaseKey = (p: string): string | undefined => TIMELINE_KEYS[PHASES.indexOf(p as Phase)];
export const keyPhase = (k: string): Phase | undefined => PHASES[TIMELINE_KEYS.indexOf(k as (typeof TIMELINE_KEYS)[number])];

export const DEFAULT_TIMELINE = [
  { key: "reg", from: "2027-08-16", to: "2027-09-05" },
  { key: "scr", from: "2027-09-06", to: "2027-09-08" },
  { key: "qual", from: "2027-09-09", to: "2027-09-10" },
  { key: "seed", from: "2027-09-11", to: "2027-09-12" },
  { key: "play", from: "2027-09-17", to: "2027-10-17" },
  { key: "done", from: "2027-10-18", to: null },
];

const ROUTES: [string, Section][] = [
  ["/info", "info"],
  ["/register", "register"],
  ["/teams/players", "players"],
  ["/teams", "teams"],
  ...ROUTES_BGCC6,
  ["/mappool", "mappool"],
  ["/matches", "schedule"],
  ["/results", "schedule"],
  ["/pickems", "pickems"],
  ["/stats", "stats"],
  ["/streams", "streams"],
  ["/staff/sponsors", "sponsors"],
  ["/staff", "staff"],
];

export const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export const activeItem = <T extends { href: string }>(items: T[], path: string): T | undefined =>
  items.reduce<T | undefined>((best, i) => (under(path, i.href) && (!best || i.href.length > best.href.length) ? i : best), undefined);

const ROUTE_ITEMS = ROUTES.map(([href, section]) => ({ href, section }));

export const sectionOf = (path: string) => activeItem(ROUTE_ITEMS, path)?.section ?? null;

export type NavKey = "home" | "me" | "register" | "info" | "qualifiers" | "teams" | "players" | "schedule" | "scheduling" | "mappool" | "pickems" | "stats" | "streams" | "staff";

/**
 * one group per top-nav entry; its items are the group's sub-nav (label = the sub-nav tab).
 * `top: false` groups only have a sub-nav, `sched` groups show only to captains who can schedule, `alias` is another path that lights the entry up
 */
export type NavGroup = { key: NavKey; base: string; top?: false; sched?: true; alias?: string; items: { href: string; section: Section | null; key?: NavKey; label?: (t: Dict) => string }[] };

const NAV: NavGroup[] = [
  { key: "home", base: "/", items: [{ href: "/", section: null }] },
  { key: "me", base: "/me", items: [{ href: "/me", section: null, label: (t) => t.me.title }] },
  {
    key: "info",
    base: "/info",
    items: [
      { href: "/info", section: "info", label: (t) => t.sub.information },
      { href: "/info/condensed", section: "info", label: (t) => t.sub.condensed },
    ],
  },
  { key: "register", base: "/register", top: false, items: [{ href: "/register", section: "register", label: (t) => t.nav.register }] },
  ...NAV_BGCC6,
  {
    key: "teams",
    base: "/teams",
    items: [
      { href: "/teams", section: "teams", label: (t) => t.sub.teamList },
      { href: "/teams/players", section: "players", key: "players", label: (t) => t.sub.players },
    ],
  },
  { key: "schedule", base: "/matches", alias: "/results", items: [{ href: "/matches", section: "schedule", label: (t) => t.sub.schedule }] },
  { key: "scheduling", base: "/scheduling", sched: true, items: [{ href: "/scheduling", section: null, label: (t) => t.nav.scheduling }] },
  { key: "mappool", base: "/mappool", items: [{ href: "/mappool", section: "mappool", label: (t) => t.nav.mappool }] },
  { key: "pickems", base: "/pickems", items: [{ href: "/pickems", section: "pickems", label: (t) => t.nav.pickems }] },
  { key: "stats", base: "/stats", items: [{ href: "/stats", section: "stats", label: (t) => t.nav.stats }] },
  {
    key: "streams",
    base: "/streams",
    items: [
      { href: "/streams", section: "streams", label: (t) => t.sub.live },
      { href: "/streams/vods", section: "streams", label: (t) => t.sub.vods },
    ],
  },
  {
    key: "staff",
    base: "/staff",
    items: [
      { href: "/staff", section: "staff", label: (t) => t.sub.staff },
      { href: "/staff/sponsors", section: "sponsors", label: (t) => t.sub.sponsors },
    ],
  },
];

export const subNavOf = (base: string, t: Dict) =>
  (NAV.find((g) => g.base === base)?.items ?? []).flatMap((i) => (i.label ? [{ href: i.href, label: i.label(t) }] : []));

export const PUBLIC_PAGES = NAV.filter((g) => g.top !== false && !g.sched && g.key !== "me" && !NAV_BGCC6.includes(g)).map((g) => g.base);

export type NavItem = { key: NavKey; href: string; base: string; alias?: string; hidden: boolean };

export const isActive = (path: string, n: { base: string; alias?: string }) =>
  n.base === "/" ? path === "/" : [n.base, n.alias].some((b) => b && under(path, b));

export function buildNav(sections: Record<string, boolean>, staff: boolean, off: string[] = [], sched = false): NavItem[] {
  const open = (s: Section | null) => s === null || !!sections[s];
  return NAV.filter((g) => g.top !== false && (!g.sched || sched)).flatMap((g) => {
    const items = g.items.filter((i) => !i.section || !off.includes(i.section));
    const pub = items.find((i) => open(i.section));
    const first = pub ?? (staff ? items[0] : undefined);
    if (!first) return [];
    return [{ key: first.key ?? g.key, href: first.href, base: g.base, alias: g.alias, hidden: !pub }];
  });
}

export function subNav<T extends { href: string }>(items: T[], sections: Record<string, boolean>, staff: boolean, off: string[] = []) {
  return items
    .filter((i) => {
      const s = sectionOf(i.href);
      return !s || !off.includes(s);
    })
    .map((i) => {
      const s = sectionOf(i.href);
      return { ...i, hidden: s !== null && !sections[s] };
    })
    .filter((i) => staff || !i.hidden);
}
