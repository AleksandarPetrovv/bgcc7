/** why a team is out of the tournament, or gave one match up */
export const OUT_KINDS = ["forfeit", "dq", "other"] as const;
export type OutKind = (typeof OUT_KINDS)[number];
export const isOutKind = (v: unknown): v is OutKind => OUT_KINDS.includes(v as OutKind);

/** the short tag shown in place of a score */
export const OUT_TAG: Record<OutKind, string> = { forfeit: "FF", dq: "DQ", other: "Out" };

/** the side of a match that gave it up */
export type Walkover = { side: 1 | 2; kind: OutKind };
export const walkoverOf = (m: { ffSide: number | null; ffKind: string | null }): Walkover | null =>
  (m.ffSide === 1 || m.ffSide === 2) && isOutKind(m.ffKind) ? { side: m.ffSide, kind: m.ffKind } : null;
