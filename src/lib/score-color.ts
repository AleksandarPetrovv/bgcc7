export const scoreHue = (v: number) => Math.round(((Math.min(10, Math.max(1, v)) - 1) / 9) * 125);
export const scoreColor = (v: number) => `hsl(${scoreHue(v)} 78% 52%)`;
export const scoreText = (v: number) => `hsl(${scoreHue(v)} 80% 28%)`;
