export type Score = readonly [number, number];

export const decideWinner = ([a, b]: Score, firstTo: number): 1 | 2 | null => (a >= firstTo && a > b ? 1 : b >= firstTo && b > a ? 2 : null);

/** a map goes to the team with the higher total; a tie is nobody's */
export const mapWinner = (a: number, b: number): 0 | 1 | 2 => (a > b ? 1 : b > a ? 2 : 0);

/** a match score from its maps' winners */
export const tally = (winners: readonly (0 | 1 | 2)[]): [number, number] => [winners.filter((w) => w === 1).length, winners.filter((w) => w === 2).length];

/** osu! scoreV2 ceiling the editor accepts */
export const MAX_SCORE = 1_600_000;
