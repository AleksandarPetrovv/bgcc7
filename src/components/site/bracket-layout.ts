export const W = 200;
export const G = 40;
export const H = 78;
export const LB = 520;
export const x = (c: number) => c * (W + G);

const GF1 = 150 + H / 2 - H - 10;
const GF2 = 150 + H / 2 + 10;

export const POS: Record<string, [number, number]> = {
  "WB-R1-M1": [0, 0], "WB-R1-M2": [0, 100], "WB-R1-M3": [0, 200], "WB-R1-M4": [0, 300],
  "WB-R2-M1": [1, 50], "WB-R2-M2": [1, 250],
  "WB-R3-M1": [2, 150],
  "LB-R1-M1": [1, LB], "LB-R1-M2": [1, LB + 100],
  "LB-R2-M1": [2, LB], "LB-R2-M2": [2, LB + 100],
  "LB-R3-M1": [3, LB + 50],
  "LB-R4-M1": [4, LB + 50],
  "GF-M1": [5, GF1], "GF-M2": [5, GF2],
};

export const WIN: Record<string, string> = {
  "WB-R1-M1": "WB-R2-M1", "WB-R1-M2": "WB-R2-M1", "WB-R1-M3": "WB-R2-M2", "WB-R1-M4": "WB-R2-M2",
  "WB-R2-M1": "WB-R3-M1", "WB-R2-M2": "WB-R3-M1", "WB-R3-M1": "GF-M1",
  "LB-R1-M1": "LB-R2-M1", "LB-R1-M2": "LB-R2-M2", "LB-R2-M1": "LB-R3-M1", "LB-R2-M2": "LB-R3-M1",
  "LB-R3-M1": "LB-R4-M1", "LB-R4-M1": "GF-M1",
};

export const HEADERS = [
  { c: 0, y: -34, t: "Round 1 (Quarter-Finals)" },
  { c: 1, y: -34, t: "Round 2 (Semi-Finals)" },
  { c: 2, y: -34, t: "Winners Finals" },
  { c: 5, y: GF1 - 34, t: "Grand Finals", gold: true },
  { c: 1, y: LB - 34, t: "Losers Round 1" },
  { c: 2, y: LB - 34, t: "Losers Round 2" },
  { c: 3, y: LB - 34, t: "Losers Round 3" },
  { c: 4, y: LB - 34, t: "Losers Finals" },
];
