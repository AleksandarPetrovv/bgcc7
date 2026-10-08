import "server-only";
import { EventEmitter } from "node:events";
import type { LiveScore, ScorePacket } from "./overlay-types";

export const LIVE_STALE_MS = 10_000;
export const IPC_PLAYING = 3;

type Store = { scores: Map<string, LiveScore>; bus: EventEmitter };
const g = globalThis as unknown as { bgccLive?: Store };
const store = () => (g.bgccLive ??= { scores: new Map(), bus: new EventEmitter().setMaxListeners(0) });

export function putLive(matchId: string, p: ScorePacket) {
  const totals: [number, number] = [0, 0];
  for (const c of p.clients) totals[c.team === "left" ? 0 : 1] += c.score;
  const live: LiveScore = { ...p, matchId, totals, at: Date.now() };
  store().scores.set(matchId, live);
  store().bus.emit("live", matchId);
  return live;
}

export function getLive(matchId: string) {
  const l = store().scores.get(matchId);
  return l && Date.now() - l.at < LIVE_STALE_MS ? l : null;
}

export function onLive(fn: (matchId: string) => void) {
  const { bus } = store();
  bus.on("live", fn);
  return () => void bus.off("live", fn);
}
