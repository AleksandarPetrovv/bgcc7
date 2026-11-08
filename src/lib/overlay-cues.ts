import "server-only";
import { editionKey, siteEdition } from "@/db/edition-context";
import { globalStore } from "./global-store";

// lobby moments the auto overlay scene follows: countdowns from !mp start N, map start/finish, aborts
export type Cue = { countdownEnd?: number; playing?: boolean; finishedAt?: number; abortAt?: number; abortHold?: boolean };

export const PLAY_LEAD = 10_000;

// lobbies only follow the site edition, so cues are keyed by it whatever the caller context
const cues = globalStore("bgccCues", () => new Map<string, Cue>());
const key = (id: string) => editionKey(id, siteEdition());
const of = (id: string) => cues.get(key(id)) ?? cues.set(key(id), {}).get(key(id))!;

export const getCue = (id: string): Cue | null => cues.get(key(id)) ?? null;

export function cueCountdown(id: string, secs: number) {
  Object.assign(of(id), { countdownEnd: Date.now() + secs * 1000, finishedAt: undefined, abortAt: undefined });
}

export function cuePlay(id: string) {
  Object.assign(of(id), { playing: true, countdownEnd: undefined, finishedAt: undefined, abortAt: undefined });
}

export function cueFinish(id: string) {
  Object.assign(of(id), { playing: false, countdownEnd: undefined, finishedAt: Date.now() });
}

export function cueAbort(id: string) {
  const c = of(id);
  const now = Date.now();
  // "!mp abort" in chat and the lobby's matchAborted event both land here; the first one decides
  if (c.abortAt && now - c.abortAt < 2000) return;
  c.abortHold = !!c.playing || (c.countdownEnd != null && now >= c.countdownEnd - PLAY_LEAD);
  Object.assign(c, { playing: false, countdownEnd: undefined, finishedAt: undefined, abortAt: now });
}
