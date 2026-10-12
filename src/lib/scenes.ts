export const SCENES = ["soon", "intro", "mappool", "gameplay", "winner", "brb", "end", "schedule", "bracket"] as const;
export type Scene = (typeof SCENES)[number];

export const isScene = (v: unknown): v is Scene => typeof v === "string" && (SCENES as readonly string[]).includes(v);
