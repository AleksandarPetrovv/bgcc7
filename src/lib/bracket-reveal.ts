// a finished match's bracket reveal: a pause, a zoom onto the boxes that change, the score, a short settle, then the winner moves, then the loser, a hold, the zoom out
export const REVEAL = { pause: 3000, zoom: 1400, settle: 1000, fly: 900, after: 600, hold: 1600 } as const;

const base = REVEAL.pause + REVEAL.zoom + REVEAL.settle + 2 * REVEAL.after + REVEAL.hold + REVEAL.zoom;
/** one match's reveal, without and with both teams flying */
export const REVEAL_MIN = base;
export const REVEAL_MAX = base + 2 * REVEAL.fly;
