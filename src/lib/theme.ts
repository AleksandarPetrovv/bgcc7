export const HEX = {
  paper: "var(--paper)",
  ash: "var(--ash)",
  ink: "var(--ink)",
  coal: "var(--coal)",
  line: "var(--line)",
  rose: "var(--rose)",
  roseHi: "var(--rose-hi)",
  balkan: "var(--balkan)",
  azure: "var(--azure)",
  gold: "var(--gold)",
  nm: "var(--mod-nm)",
  hd: "var(--mod-hd)",
  hr: "var(--mod-hr)",
  dt: "var(--mod-dt)",
  fm: "var(--mod-fm)",
} as const;

export const tint =(color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const TEAM = {
  1: { c: "var(--crimson)", deep: "var(--crimson-deep)", hi: "var(--crimson-hi)", text: "text-crimson-hi", bg: "bg-crimson", border: "border-crimson" },
  2: { c: "var(--azure)", deep: "var(--azure-deep)", hi: "var(--azure-hi)", text: "text-azure-hi", bg: "bg-azure", border: "border-azure" },
} as const;

export const LOBBY_TEAM = { red: TEAM[1].c, blue: TEAM[2].c } as const;

export const MEDAL = ["text-gold-hi", "text-silver-deep", "text-bronze-hi"];
export const MEDAL_BG = ["bg-gold", "bg-silver", "bg-bronze"];

export const GOLD ={ c: "var(--gold)", deep: "var(--gold-deep)", hi: "var(--gold-hi)" } as const;

export const MOD_COLOR: Record<string, string> = {
  NM: "var(--mod-nm)",
  HD: "var(--mod-hd)",
  HR: "var(--mod-hr)",
  DT: "var(--mod-dt)",
  NC: "var(--mod-dt)",
  FM: "var(--mod-fm)",
  TB: "var(--mod-tb)",
  NF: "var(--paper)",
};

// mod colors are fills; modHi (raw palette var, theme vars only exist when a utility uses them) gives the text shade on the canvas, modOn the text color on a mod fill
export const modHi = <T extends string | undefined>(c: T) => c?.replace(/--(?:color-)?(mod-[a-z]+)\)$/, "--$1-hi)") as T;
export const modOn = (c?: string) =>
  c?.includes("paper") ? "var(--ink)" : /mod-hd\)|gold|balkan|silver/.test(c ?? "") ? "var(--on-fill)" : "var(--white)";
