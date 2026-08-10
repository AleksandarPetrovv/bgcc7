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

export const MOD_ACRONYM: Record<string, string[]> = { HardRock: ["HR"], DoubleTime: ["DT"] };
