import "server-only";
import { EventEmitter } from "node:events";
import { currentEdition, editionKey } from "@/db/edition-context";
import { globalStore } from "./global-store";
import type { LiveScore } from "./overlay-types";
import { LIVE_STALE_MS, type LiveReject, type ScorePacket } from "./relay-contract";

type Store = { scores: Map<string, LiveScore>; rejects?: Map<string, { why: LiveReject; at: number }>; bus: EventEmitter };
const store = () => globalStore<Store>("bgccLive", () => ({ scores: new Map(), bus: new EventEmitter().setMaxListeners(0) }));
const rejects = () => (store().rejects ??= new Map());

export function rejectLive(matchId: string, why: LiveReject) {
  rejects().set(editionKey(matchId), { why, at: Date.now() });
}

export function getReject(matchId: string) {
  const r = rejects().get(editionKey(matchId));
  return r && Date.now() - r.at < LIVE_STALE_MS ? r.why : null;
}

export function putLive(matchId: string, p: ScorePacket) {
  const totals: [number, number] = [0, 0];
  for (const c of p.clients) totals[c.team === "left" ? 0 : 1] += c.score;
  const live: LiveScore = { ...p, matchId, totals, at: Date.now() };
  const edition = currentEdition();
  store().scores.set(editionKey(matchId, edition), live);
  rejects().delete(editionKey(matchId, edition));
  store().bus.emit("live", edition, matchId);
  return live;
}

export function getLive(matchId: string) {
  const l = store().scores.get(editionKey(matchId));
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
