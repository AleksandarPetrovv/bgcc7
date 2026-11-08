import { GF, type Format } from "./format";

const PHONE_W = 640;
const FALLBACK_W = 1500;
const COL_MAX = 290;
const UPSCALE_FROM = 1280;
const UPSCALE_MAX = 2;
const SHRINK_FROM = 768;

export const availOr = (avail: number) => avail || FALLBACK_W;
export const isPhone = (avail: number) => avail > 0 && avail < PHONE_W;

export function colWidth(f: Format, avail: number, fill = 0) {
  const { gfCol } = f.layout;
  const { g, minW } = f.layout.box;
  const w = (avail / (fill || 1) - gfCol * g - 8) / (gfCol + 1);
  return Math.floor(fill ? Math.max(minW, w) : Math.min(COL_MAX, Math.max(minW, w)));
}

export const upscale = (avail: number, width: number) => (avail >= UPSCALE_FROM && width < avail ? Math.min(UPSCALE_MAX, avail / width) : 1);

export const shrinkScale = (avail: number, width: number) => (avail < SHRINK_FROM || width <= avail ? 1 : avail / width);

export const wirePath = (x1: number, y1: number, x2: number, y2: number, gap: number) => `M${x1} ${y1} H${x2 - gap / 2} V${y2} H${x2}`;

export const gfRound = (f: Format) => f.rounds[GF].name;
