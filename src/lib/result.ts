export type Score = readonly [number, number];

/** the one winner rule: a side wins once it has reached firstTo and is ahead */
export const decideWinner = ([a, b]: Score, firstTo: number): 1 | 2 | null => (a >= firstTo && a > b ? 1 : b >= firstTo && b > a ? 2 : null);
