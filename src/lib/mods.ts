const TABLE = [
  { name: "NoMod", short: "NM", label: "No Mod", color: "var(--mod-nm)", lobby: "NF" },
  { name: "Hidden", short: "HD", label: "Hidden", color: "var(--mod-hd)", lobby: "HD NF", sr: true },
  { name: "HardRock", short: "HR", label: "Hard Rock", color: "var(--mod-hr)", lobby: "HR NF", sr: true },
  { name: "DoubleTime", short: "DT", label: "Double Time", color: "var(--mod-dt)", lobby: "DT NF", sr: true },
  { name: "FreeMod", short: "FM", label: "Free Mod", color: "var(--mod-fm)" },
  { name: "Tiebreaker", short: "TB", label: "Tiebreaker", color: "var(--mod-tb)" },
] as const;

type Mod = { name: string; short: string; label: string; color: string; lobby?: string; sr?: boolean };
const rows: readonly Mod[] = TABLE;

export const MOD_ORDER = rows.map((m) => m.name);
export const MODS: Record<string, { label: string; short: string; color: string }> = Object.fromEntries(rows.map((m) => [m.name, { label: m.label, short: m.short, color: m.color }]));
/** colour by acronym; NC plays as DT, NF has no colour of its own */
export const MOD_COLOR: Record<string, string> = { ...Object.fromEntries(rows.map((m) => [m.short, m.color])), NC: "var(--mod-dt)", NF: "var(--paper)" };
export const LONG_MOD: Record<string, string> = Object.fromEntries(rows.map((m) => [m.short, m.name]));
/** `!mp mods` arguments; mods without one (FreeMod, Tiebreaker) leave the lobby on freemod */
export const MOD_LOBBY: Record<string, string> = Object.fromEntries(rows.flatMap((m) => (m.lobby ? [[m.name, m.lobby]] : [])));
/** mods that change star rating, as the acronyms the osu! api takes */
export const MOD_ACRONYM: Record<string, string[]> = Object.fromEntries(rows.flatMap((m) => (m.sr ? [[m.name, [m.short]]] : [])));

/** what a score editor can set on a player, in display order */
export const PICK_MODS = ["NM", "HD", "HR", "DT"] as const;

/** tiebreaker maps (and freemod ones on bgcc6) allow more than one mod; every other slot is exactly one */
export const multiPick = (mod: string | null, bgcc6: boolean) => mod === "Tiebreaker" || (bgcc6 && mod === "FreeMod");

/** NM and DT stand alone, HD and HR may pair up; the result stays in PICK_MODS order */
export function togglePick(cur: readonly string[], m: string): string[] {
  if (m !== "HD" && m !== "HR") return cur.includes(m) ? [] : [m];
  const keep: string[] = cur.filter((x) => x === "HD" || x === "HR");
  return PICK_MODS.filter((x) => (x === m ? !keep.includes(m) : keep.includes(x)));
}

export const validPick = (mods: readonly string[], multi: boolean) =>
  mods.every((m) => (PICK_MODS as readonly string[]).includes(m)) && (mods.length === 1 || (multi && mods.length === 2 && mods[0] === "HD" && mods[1] === "HR"));

const clamp = (v: number) => Math.min(11, Math.round(v * 100) / 100);
const arToMs = (ar: number) => (ar < 5 ? 1800 - 120 * ar : 1200 - 150 * (ar - 5));
const msToAr = (ms: number) => (ms > 1200 ? (1800 - ms) / 120 : 5 + (1200 - ms) / 150);

export type BaseStats = { bpm: number; length: number; ar: number; od: number; cs: number };

export function applyMod(mod: string, s: BaseStats): BaseStats {
  if (mod === "HardRock") return { ...s, cs: clamp(Math.min(10, s.cs * 1.3)), ar: clamp(Math.min(10, s.ar * 1.4)), od: clamp(Math.min(10, s.od * 1.4)) };
  if (mod === "DoubleTime")
    return {
      bpm: Math.round(s.bpm * 1.5 * 10) / 10,
      length: Math.round(s.length / 1.5),
      cs: s.cs,
      ar: clamp(msToAr(arToMs(s.ar) / 1.5)),
      od: clamp((80 - (80 - 6 * s.od) / 1.5) / 6),
    };
  return s;
}
