export type PhaseWarning =
  | { kind: "pending"; n: number }
  | { kind: "players"; n: number; need: number }
  | { kind: "teams"; n: number; need: number }
  | { kind: "bracket"; n: number }
  | { kind: "pool"; title: string | null }
  | { kind: "final" }
  | { kind: "back" };
