/** the house ease-out curve; css has the same one as var(--ease) */
export const EASE = [0.16, 1, 0.3, 1] as const;
/** slow in-out for calm overlay changes (chat scroll, roll number to "?") */
export const CALM = { duration: 0.9, ease: [0.45, 0, 0.25, 1] } as const;
