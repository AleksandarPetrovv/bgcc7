export type Side = 1 | 2;
export type DraftStep = { team: Side; kind: "ban" | "pick"; slot: string; skip?: boolean; winner?: Side; auto?: boolean };

export type DraftView = {
  open: boolean;
  stageSlug: string;
  bans: number;
  banOrder: "abab" | "abba";
  roll1: number | null;
  roll2: number | null;
  choice: "pick" | "ban" | null;
  steps: DraftStep[];
  rev: number;
  turnAt: string | null;
  pausedAt: string | null;
  pauseUntil: string | null;
  now: number;
  banSecs: number;
  pickSecs: number;
  firstTo: number;
  hasTb: boolean;
  playing?: { at: number; mapId: number } | null;
  undo?: DraftUndo | null;
  redo?: DraftUndo | null;
};

export type DraftUndo =
  | { kind: "winner"; slot: string; winner: Side }
  | { kind: "step"; step: DraftStep }
  | { kind: "choice"; choice: string }
  | { kind: "rolls"; roll1: number | null; roll2: number | null };

export type Turn =
  | { kind: "roll" }
  | { kind: "tie" }
  | { kind: "choose"; team: Side }
  | { kind: "ban" | "pick"; team: Side; n: number }
  | { kind: "wait" }
  | { kind: "done" };

export const other = (s: Side): Side => (s === 1 ? 2 : 1);

export const rollWinner = (d: Pick<DraftView, "roll1" | "roll2">): Side | null =>
  d.roll1 == null || d.roll2 == null || d.roll1 === d.roll2 ? null : d.roll1 > d.roll2 ? 1 : 2;

export function banTeam(order: DraftView["banOrder"], i: number, first: Side): Side {
  const a = order === "abba" ? [0, 1, 1, 0][i % 4] : i % 2;
  return a === 0 ? first : other(first);
}

export function turnOf(d: DraftView, slots: string[]): Turn {
  if (d.roll1 == null || d.roll2 == null) return { kind: "roll" };
  if (d.roll1 === d.roll2) return { kind: "tie" };
  const winner = rollWinner(d)!;
  if (!d.choice) return { kind: "choose", team: winner };
  const firstBan = d.choice === "ban" ? winner : other(winner);
  const firstPick = d.choice === "pick" ? winner : other(winner);
  const used = new Set(d.steps.filter((s) => !s.skip).map((s) => s.slot));
  const left = slots.filter((s) => !used.has(s)).length;
  const bans = d.steps.filter((s) => s.kind === "ban" && !s.skip).length;
  const totalBans = Math.min(d.bans * 2, Math.max(0, slots.length - 1));
  let missed = 0;
  for (let i = d.steps.length - 1; i >= 0 && d.steps[i].skip; i--) missed++;
  const swap = (s: Side) => (missed % 2 ? other(s) : s);
  if (bans < totalBans) return { kind: "ban", team: swap(banTeam(d.banOrder, bans, firstBan)), n: bans + 1 };
  const [s1, s2] = scoreOf(d);
  const played = d.steps.filter((s) => s.kind === "pick" && !s.skip);
  if (d.firstTo && (s1 >= d.firstTo || s2 >= d.firstTo)) return { kind: "done" };
  if (played.length && !played.at(-1)!.winner) return { kind: "wait" };
  if (tbDue(d)) return { kind: "wait" };
  if (!left) return { kind: "done" };
  const picks = played.length;
  return { kind: "pick", team: swap(picks % 2 === 0 ? firstPick : other(firstPick)), n: picks + 1 };
}

export function plan(d: DraftView): { team: Side; kind: "ban" }[] {
  const w = rollWinner(d);
  if (!w || !d.choice) return [];
  const firstBan = d.choice === "ban" ? w : other(w);
  return Array.from({ length: d.bans * 2 }, (_, i) => ({ team: banTeam(d.banOrder, i, firstBan), kind: "ban" as const }));
}

export const pickable = (slot: string) => slot !== "TB";

export const limitOf = (d: Pick<DraftView, "banSecs" | "pickSecs">, kind: Turn["kind"]) => (kind === "ban" ? d.banSecs : kind === "pick" ? d.pickSecs : 0);

export function deadline(d: DraftView, slots: string[]) {
  const turn = turnOf(d, slots);
  const limit = limitOf(d, turn.kind);
  if (!limit || !d.turnAt) return null;
  return new Date(d.turnAt).getTime() + limit * 1000;
}

export function scoreOf(d: Pick<DraftView, "steps">): [number, number] {
  const won = d.steps.filter((s) => s.kind === "pick" && !s.skip);
  return [won.filter((s) => s.winner === 1).length, won.filter((s) => s.winner === 2).length];
}

export function tbDue(d: Pick<DraftView, "steps" | "firstTo" | "hasTb">) {
  const [s1, s2] = scoreOf(d);
  return d.hasTb && d.firstTo > 1 && s1 === d.firstTo - 1 && s2 === d.firstTo - 1 && !d.steps.some((s) => s.slot === "TB");
}
