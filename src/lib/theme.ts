export const HEX = {
  paper: "#f4f3ee",
  ash: "#8a908b",
  ink: "#0d0f0e",
  coal: "#161917",
  line: "#2b302d",
  rose: "#e0242f",
  roseHi: "#f24a54",
  balkan: "#0fa06a",
  azure: "#3b82f6",
  gold: "#e8c547",
  nm: "#3b82f6",
  hd: "#f5b820",
  hr: "#e0242f",
  dt: "#a78bfa",
  fm: "#0fa06a",
} as const;

export const tint =(color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const TEAM = {
  1: { c: "var(--color-rose)", deep: "var(--color-rose-deep)", hi: "var(--color-rose-hi)", text: "text-rose-hi", bg: "bg-rose", border: "border-rose" },
  2: { c: "var(--color-azure)", deep: "var(--color-azure-deep)", hi: "var(--color-azure-hi)", text: "text-azure-hi", bg: "bg-azure", border: "border-azure" },
} as const;

export const LOBBY_TEAM = { red: TEAM[1].c, blue: TEAM[2].c } as const;

export const MEDAL = ["text-gold", "text-silver", "text-bronze"];
export const MEDAL_BG = ["bg-gold", "bg-silver", "bg-bronze"];

export const GOLD ={ c: "var(--color-gold)", deep: "var(--color-gold-deep)", hi: "var(--color-gold-hi)" } as const;

export const MOD_COLOR: Record<string, string> = {
  NM: "var(--color-mod-nm)",
  HD: "var(--color-mod-hd)",
  HR: "var(--color-mod-hr)",
  DT: "var(--color-mod-dt)",
  NC: "var(--color-mod-dt)",
  FM: "var(--color-mod-fm)",
  TB: "var(--color-mod-tb)",
  NF: "var(--color-paper)",
};
