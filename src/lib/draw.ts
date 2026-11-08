// the on-stream team draw: one wheel per tier, a tier A spin puts a captain in the box, the next tier B spin pairs them into a team.
// pure so the server, the live view and /draw/demo all step the same state

export type DrawWheel = "a" | "b";
export type DrawPlayer = { id: number; name: string; avatar: string | null; seed: number };
export type DrawOp = { w: DrawWheel; id: number };
export type DrawPair = { a: number; b: number | null; team: string | null };
export type DrawLast = { kind: "spin" | "undo" | "redo"; op: DrawOp } | null;
/**
 * `ended`: the host closed a full draw and the final teams are on screen. `bracket`: after that, the winners bracket is open
 * with this many teams placed into the round of 16 (two per match, in match order). any pick drops both
 */
export type DrawState = { pairs: DrawPair[]; redo: DrawOp[]; seq: number; last: DrawLast; ended?: boolean; bracket?: number | null };

/** what /draw and /admin/draw show. `taken`: players already on a team made outside the draw, `redo`: a taken back pick can be put back */
export type DrawFeed = { open: boolean; a: DrawPlayer[]; b: DrawPlayer[]; taken: number[]; pairs: { a: number; b: number | null }[]; seq: number; last: DrawLast; redo: boolean; ended: boolean; seeds: DrawSeed[] | null; bracket: DrawBracket | null; build: string };

/** the round of 16 being revealed: `r1` holds pair indexes per match (in feed.pairs), `shown` how many slots are filled */
export type DrawBracket = { shown: number; r1: [number, number][] };
/** once ended, the teams by seed (index 0 is seed 1): their pair index and their players' average seed */
export type DrawSeed = { pair: number; avg: number };

export const canRedo = (s: Pick<DrawState, "pairs" | "redo">) => s.redo.at(-1)?.w === nextWheel(s.pairs);

export const EMPTY_DRAW: DrawState = { pairs: [], redo: [], seq: 0, last: null };

export const nextWheel = (pairs: { b: number | null }[]): DrawWheel => (pairs.at(-1)?.b === null ? "b" : "a");

/** players of one tier still on their wheel */
export function onWheel(players: DrawPlayer[], pairs: { a: number; b: number | null }[], taken: number[]) {
  const out = new Set([...taken, ...pairs.flatMap((p) => (p.b === null ? [p.a] : [p.a, p.b]))]);
  return players.filter((p) => !out.has(p.id));
}

/** a spin or redo of `op`; `team` is the team the server made for a tier B pick */
export function addPick(s: DrawState, op: DrawOp, kind: "spin" | "redo", team: string | null = null): DrawState {
  const pairs = op.w === "a" ? [...s.pairs, { a: op.id, b: null, team: null }] : s.pairs.map((p, i) => (i === s.pairs.length - 1 ? { ...p, b: op.id, team } : p));
  return { pairs, redo: kind === "redo" ? s.redo.slice(0, -1) : [], seq: s.seq + 1, last: { kind, op } };
}

export const drawDone = (pairs: { b: number | null }[], teams: number) => pairs.filter((p) => p.b !== null).length >= teams;

/** shows or hides the final teams; not a pick, so `last` is cleared and viewers just jump to it */
export const setEnded = (s: DrawState, ended: boolean): DrawState => ({ ...s, ended, bracket: null, seq: s.seq + 1, last: null });

/** opens (0), fills (+1) or takes back (-1, null closes) the bracket reveal; like `setEnded` not a pick */
export const setBracket = (s: DrawState, bracket: number | null): DrawState => ({ ...s, bracket, seq: s.seq + 1, last: null });

/** takes back the newest pick: a finished pair loses its tier B player first, then the captain leaves the box */
export function undoPick(s: DrawState): DrawState | null {
  const last = s.pairs.at(-1);
  if (!last) return null;
  const op: DrawOp = last.b === null ? { w: "a", id: last.a } : { w: "b", id: last.b };
  const pairs = last.b === null ? s.pairs.slice(0, -1) : [...s.pairs.slice(0, -1), { a: last.a, b: null, team: null }];
  return { pairs, redo: [...s.redo, op], seq: s.seq + 1, last: { kind: "undo", op } };
}
