import { winTargets, type Format } from "@/lib/format";

export function pickLayout(f: Format) {
  const { upRows, gfRow, gfCol, lowRows } = f.layout;
  const { w: W, g: G, h: H, pitch } = f.layout.pick;
  const x = (c: number) => c * (W + G);
  const LB = upRows * pitch + 120;
  const GF1 = gfRow * pitch + H / 2 - H - 10;
  const GF2 = gfRow * pitch + H / 2 + 10;
  const POS: Record<string, [number, number]> = { "GF-M1": [gfCol, GF1], "GF-M2": [gfCol, GF2] };
  for (const [id, [c, r, s]] of Object.entries(f.layout.pos)) POS[id] = [c, (s === "u" ? 0 : LB) + r * pitch];
  const HEADERS = [
    ...f.layout.headers.map((h) => ({ c: h.c, y: h.s === "u" ? -34 : LB - 34, t: h.t, gold: false })),
    { c: gfCol, y: GF1 - 34, t: "Grand Finals", gold: true },
  ];
  return { W, G, H, x, LB, POS, WIN: winTargets(f), HEADERS, gfCol, width: x(gfCol) + W, height: LB + (lowRows - 1) * pitch + H + 8 };
}
