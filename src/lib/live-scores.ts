import "server-only";
import { EventEmitter } from "node:events";
import { currentEdition } from "@/db";
import type { LiveScore, ScorePacket } from "./overlay-types";

export const LIVE_STALE_MS = 10_000;
export const IPC_PLAYING = 3;

export type LiveReject = "noplayers" | "players" | "swapped" | "map";

type Store = { scores: Map<string, LiveScore>; rejects?: Map<string, { why: LiveReject; at: number }>; bus: EventEmitter };
const g = globalThis as unknown as { bgccLive?: Store };
const store = (): Store => (g.bgccLive ??= { scores: new Map(), bus: new EventEmitter().setMaxListeners(0) });
const rejects = () => (store().rejects ??= new Map());

export function rejectLive(matchId: string, why: LiveReject) {
  rejects().set(`${currentEdition()}:${matchId}`, { why, at: Date.now() });
}

export function getReject(matchId: string) {
  const r = rejects().get(`${currentEdition()}:${matchId}`);
  return r && Date.now() - r.at < LIVE_STALE_MS ? r.why : null;
}

export function putLive(matchId: string, p: ScorePacket) {
  const totals: [number, number] = [0, 0];
  for (const c of p.clients) totals[c.team === "left" ? 0 : 1] += c.score;
  const live: LiveScore = { ...p, matchId, totals, at: Date.now() };
  const edition = currentEdition();
  store().scores.set(`${edition}:${matchId}`, live);
  rejects().delete(`${edition}:${matchId}`);
  store().bus.emit("live", edition, matchId);
  return live;
}

export function getLive(matchId: string) {
  const l = store().scores.get(`${currentEdition()}:${matchId}`);
  return l && Date.now() - l.at < LIVE_STALE_MS ? l : null;
}

export function onLive(fn: (matchId: string) => void) {
  const { bus } = store();
  const edition = currentEdition();
  const listener = (source: string, matchId: string) => {
    if (source === edition) fn(matchId);
  };
  bus.on("live", listener);
  return () => void bus.off("live", listener);
}
