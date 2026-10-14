import { MOD_COLOR } from "./theme";
import { DEFAULT_CATALOG, DEFAULT_QF, DEFAULT_RO16 } from "./format-defaults";

export const PLAN_MODS = ["NM", "HD", "HR", "DT"] as const;
export type PlanMod = (typeof PLAN_MODS)[number];

export type PlanMap = { id: string; mod: PlanMod; note: string; subcategoryIds?: string[] };
export type PlanCat = { id: string; name: string; maps: PlanMap[] };

export const PLAN_STAGES = [
  { slug: "round-of-16", name: "Round of 16" },
  { slug: "quarterfinals", name: "Quarterfinals" },
  { slug: "semifinals", name: "Semifinals" },
  { slug: "finals", name: "Finals" },
  { slug: "grand-finals", name: "Grand Finals" },
] as const;

export type PlanRound = { slug: string; name: string; firstTo: number; bans: number; sr?: number | null; cats: PlanCat[]; tbNote: string; tbSubcategoryIds?: string[] };
export type SubcategoryGroup = { id: string; name: string; items: { id: string; name: string }[] };
export type Plan = { rounds: PlanRound[]; subcategories: SubcategoryGroup[] };

export const DEFAULT_SUBCATEGORIES: SubcategoryGroup[] = DEFAULT_CATALOG;

export function selectedSubcategories(rounds: PlanRound[], catId: string, mapId?: string): string[] {
  for (const r of [...rounds].reverse()) {
    const ids = mapId ? r.cats.find((c) => c.id === catId)?.maps.find((m) => m.id === mapId)?.subcategoryIds : r.tbSubcategoryIds;
    if (ids !== undefined) return ids;
  }
  return [];
}

export function subcategoryNames(groups: SubcategoryGroup[], ids: string[]): string[] {
  const items = groups.flatMap((g) => g.items);
  return ids.flatMap((id) => items.find((item) => item.id === id)?.name || []);
}

export const newId = () => Math.random().toString(36).slice(2, 10);

const cat = (name: string, mods: PlanMod[]): PlanCat => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name,
  maps: mods.map((mod, i) => ({ id: `${mod}${i}`, mod, note: "" })),
});

const mid = () => [
  cat("Aim", ["NM", "NM", "HR", "DT", "DT"]),
  cat("Speed", ["DT", "DT"]),
  cat("Reading", ["NM", "HD", "DT"]),
  cat("Stamina", ["NM"]),
  cat("Finger control", ["NM", "DT"]),
];

const late = () => [
  cat("Aim", ["NM", "NM", "HR", "DT", "DT"]),
  cat("Speed", ["DT", "DT", "DT"]),
  cat("Reading", ["NM", "HD", "DT"]),
  cat("Stamina", ["NM", "NM"]),
  cat("Finger control", ["NM", "DT"]),
];

export const DEFAULT_PLAN: Plan = {
  subcategories: DEFAULT_SUBCATEGORIES,
  rounds: [
    DEFAULT_RO16,
    DEFAULT_QF,
    { slug: "semifinals", name: "Semifinals", firstTo: 6, bans: 1, cats: mid(), tbNote: "" },
    { slug: "finals", name: "Finals", firstTo: 7, bans: 1, cats: late(), tbNote: "" },
    { slug: "grand-finals", name: "Grand Finals", firstTo: 7, bans: 1, cats: late(), tbNote: "" },
  ],
};

const MOD_RANK = Object.fromEntries(PLAN_MODS.map((m, i) => [m, i])) as Record<PlanMod, number>;
export const sortMaps = (maps: PlanMap[]) => [...maps].sort((a, b) => MOD_RANK[a.mod] - MOD_RANK[b.mod]);

export function roundStats(r: PlanRound) {
  const all = r.cats.flatMap((c) => c.maps);
  const tally = Object.fromEntries(PLAN_MODS.map((m) => [m, all.filter((x) => x.mod === m).length])) as Record<PlanMod, number>;
  const pickable = all.length;
  const picks = 2 * (r.firstTo - 1);
  const open = Math.max(0, pickable - 2 * r.bans);
  return { tally, pickable, maps: pickable + 1, picks, open, bestOf: 2 * r.firstTo - 1, ratio: open ? picks / open : 0 };
}

const int = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v: unknown, max: number, d: string) => (typeof v === "string" ? v.trim().slice(0, max) : d);
const isMod = (v: unknown): v is PlanMod => typeof v === "string" && (PLAN_MODS as readonly string[]).includes(v);

type Loose = { id?: unknown; name?: unknown; maps?: unknown; mods?: Record<string, unknown> };

function cleanCat(c: Loose, validIds: Set<string>): PlanCat {
  const maps: PlanMap[] = Array.isArray(c.maps)
    ? (c.maps as { id?: unknown; mod?: unknown; note?: unknown; subcategoryIds?: unknown }[]).filter((m) => isMod(m?.mod)).map((m) => ({ id: str(m.id, 20, "") || newId(), mod: m.mod as PlanMod, note: "", subcategoryIds: cleanIds(m.subcategoryIds, validIds) }))
    : PLAN_MODS.flatMap((mod) => Array.from({ length: int(c.mods?.[mod], 0, 20, 0) }, () => ({ id: newId(), mod, note: "" })));
  return { id: str(c.id, 20, "") || newId(), name: str(c.name, 30, "Category") || "Category", maps: maps.slice(0, 20) };
}

const cleanIds = (v: unknown, valid: Set<string>): string[] | undefined => Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === "string" && valid.has(id)))] : undefined;

export function cleanPlan(v: unknown): Plan | null {
  if (!v || typeof v !== "object" || !Array.isArray((v as Plan).rounds)) return null;
  const input = v as Plan;
  const seen = new Set<string>();
  const subcategories = (Array.isArray(input.subcategories) ? input.subcategories : DEFAULT_SUBCATEGORIES).slice(0, 16).filter((g) => g && typeof g === "object").map((g) => ({
    id: str(g.id, 40, "") || newId(), name: str(g.name, 60, "category") || "category",
    items: (Array.isArray(g.items) ? g.items : []).slice(0, 100).filter((item) => item && typeof item === "object").flatMap((item) => {
      const id = str(item.id, 40, "") || newId();
      const name = str(item.name, 80, "");
      if (!name || seen.has(id)) return [];
      seen.add(id);
      return [{ id, name }];
    }),
  }));
  const saved = (v as { rounds: (Partial<PlanRound> & { cats?: Loose[] })[] }).rounds;
  const rounds = PLAN_STAGES.map((st, i) => {
    const r = saved.find((x) => x?.slug === st.slug) ?? saved[i];
    const d = DEFAULT_PLAN.rounds[i];
    if (!r || typeof r !== "object") return d;
    return {
      slug: st.slug,
      name: st.name,
      firstTo: int(r.firstTo, 1, 15, d.firstTo),
      bans: int(r.bans, 0, 6, d.bans),
      sr: typeof r.sr === "number" && Number.isFinite(r.sr) && r.sr > 0 ? Math.round(Math.min(15, r.sr) * 100) / 100 : null,
      tbNote: "",
      tbSubcategoryIds: cleanIds(r.tbSubcategoryIds, seen),
      cats: (Array.isArray(r.cats) ? r.cats : []).slice(0, 16).map((c) => cleanCat(c, seen)),
    };
  });
  return { rounds, subcategories };
}

export const LONG_MOD: Record<PlanMod, string> = { NM: "NoMod", HD: "Hidden", HR: "HardRock", DT: "DoubleTime" };

export const SKILLS: Record<string, { abbr: string; color: string }> = {
  aim: { abbr: "AIM", color: "var(--color-mod-nm)" },
  speed: { abbr: "SPD", color: "var(--color-mod-dt)" },
  reading: { abbr: "RDG", color: "var(--color-mod-fm)" },
  "finger-control": { abbr: "FGC", color: "var(--color-mod-hd)" },
  stamina: { abbr: "STM", color: "var(--color-mod-hr)" },
};
const TB_SKILL = { abbr: "TB", color: "var(--color-mod-tb)" };

const skillOf = (c: { id: string; name: string }) =>
  SKILLS[c.id] ?? SKILLS[c.name.trim().toLowerCase().replace(/\s+/g, "-")] ?? { abbr: c.name.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "MAP", color: "var(--color-paper)" };


export const skillColor = (slot: string) => Object.values(SKILLS).find((s) => s.abbr === slot.replace(/\d+$/, ""))?.color;

export const slotColor = (slot: string) => {
  const p = slot.replace(/\d+$/, "");
  return Object.values(SKILLS).find((s) => s.abbr === p)?.color ?? MOD_COLOR[p] ?? "var(--color-paper)";
};

export type SkillSlot = { mod: string; slot: number; note: string; label: string };
export type SkillGroup = { id: string; name: string; abbr: string; color: string; slots: SkillSlot[] };
export type SkillLayout = { groups: SkillGroup[]; blueprint: Record<string, number>; firstTo: number; bans: number };

export function skillLayout(plan: Plan, slug: string): SkillLayout | null {
  const at = plan.rounds.findIndex((r) => r.slug === slug);
  if (at < 0) return null;
  const r = plan.rounds[at];
  const rounds = plan.rounds.slice(0, at + 1);
  const note = (catId: string, mapId?: string) => subcategoryNames(plan.subcategories, selectedSubcategories(rounds, catId, mapId)).join("\n");
  const next: Record<string, number> = {};
  const groups: SkillGroup[] = r.cats.map((c) => {
    const sk = skillOf(c);
    return {
      id: c.id,
      name: c.name,
      ...sk,
      slots: sortMaps(c.maps).map((m, k) => {
        const mod = LONG_MOD[m.mod];
        const slot = next[mod] ?? 0;
        next[mod] = slot + 1;
        return { mod, slot, note: note(c.id, m.id), label: `${sk.abbr}${k + 1}` };
      }),
    };
  });
  groups.push({ id: "tb", name: "Tiebreaker", ...TB_SKILL, slots: [{ mod: "Tiebreaker", slot: 0, note: note("tb"), label: "TB" }] });
  return { groups, blueprint: { ...next, Tiebreaker: 1 }, firstTo: r.firstTo, bans: r.bans };
}

export const skillSlot = (layout: SkillLayout | null | undefined, mod: string, slot: number) => {
  for (const g of layout?.groups ?? []) {
    const s = g.slots.find((x) => x.mod === mod && x.slot === slot);
    if (s) return { ...s, group: g };
  }
  return null;
};

type PoolMap = { mod: string; order: number };

export function bySkill<M extends PoolMap, S extends { pools: { category: string; color?: string; maps: M[] }[] }>(stage: S, layout?: SkillLayout | null): S {
  if (!layout) return stage;
  const all = stage.pools.flatMap((p) => p.maps);
  const pools = layout.groups
    .map((g) => ({
      category: g.id === "tb" ? "Tiebreaker" : g.name,
      color: g.color,
      maps: g.slots.flatMap((s) => all.find((m) => m.mod === s.mod && m.order === s.slot) ?? []),
    }))
    .filter((p) => p.maps.length);
  return { ...stage, pools };
}
