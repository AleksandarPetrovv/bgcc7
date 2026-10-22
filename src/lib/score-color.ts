export const scoreHue = (v: number) => Math.round(((Math.min(10, Math.max(1, v)) - 1) / 9) * 125);
export const scoreColor = (v: number) => `hsl(${scoreHue(v)} 66% 44%)`;
export const scoreText = (v: number) => `color-mix(in oklab, hsl(${scoreHue(v)} 72% 42%) 62%, var(--paper))`;
