"use server";

import { endDraw, finishDraw, lastDraw, openBracket, redoDraw, revealBracket, spinDraw, undoDraw } from "@/db/draw";
import { guard } from "@/lib/admin-action";

const run = (name: "draw.spin" | "draw.undo" | "draw.redo", fn: () => Promise<string | null>) =>
  guard("host", name, async () => {
    const player = await fn();
    return player === null ? { ok: false, error: "invalid" } : { log: { player } };
  });

export const spin = async () => run("draw.spin", spinDraw);
export const last = async () => run("draw.spin", lastDraw);
export const undo = async () => run("draw.undo", undoDraw);
export const redo = async () => run("draw.redo", redoDraw);
export const bracket = async () => guard("host", "draw.end", async () => ((await openBracket()) === null ? { ok: false, error: "invalid" } : { log: { on: true } }));
export const reveal = async () => run("draw.spin", revealBracket);
export const end = async () => guard("host", "draw.end", async () => ((await endDraw()) === null ? { ok: false, error: "invalid" } : { log: { on: true } }));
export const finish = async () => guard("host", "draw.end", async () => ((await finishDraw()) === null ? { ok: false, error: "invalid" } : { log: { on: true } }));
