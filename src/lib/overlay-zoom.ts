import "server-only";
import { editionKey } from "@/db";
import { globalStore } from "@/lib/global-store";
import { REVEAL, REVEAL_MAX, REVEAL_MIN } from "@/lib/bracket-reveal";

// an overlay can show a change up to ~1s late (sse poll) plus the scene wipe; past this, a missing "settled" report is assumed
const LATE = 3000;

type State = { since: number; revealAt: number | null; on: boolean; toggledAt: number; settledAt: number | null; paused: number; pauseFrom: number | null };

// shortcut: in memory, so a restart drops a zoom and its paused time; move to the matches row if that ever matters mid-match
const store = globalStore("bgccBracketZoom", () => new Map<string, State>());

function settle(s: State, at: number) {
  if (s.settledAt !== null) return;
  s.settledAt = at;
  if (!s.on && s.pauseFrom !== null) {
    s.paused += at - s.pauseFrom;
    s.pauseFrom = null;
  }
}

function tick(s: State, now: number, reveal: boolean) {
  if (reveal && s.revealAt === null && now >= s.since + REVEAL_MAX + LATE) s.revealAt = s.since + REVEAL_MAX + LATE;
  if (s.settledAt === null && now >= s.toggledAt + REVEAL.zoom + LATE) settle(s, s.toggledAt + REVEAL.zoom + LATE);
}

/** time the bracket scene was held by a manual zoom (zoomed in, or still zooming out); `held` = the scene must not change yet */
export function zoomPause(matchId: string, now: number) {
  const s = store.get(editionKey(matchId));
  if (!s) return { paused: 0, held: false };
  return { paused: s.paused + (s.pauseFrom !== null ? now - s.pauseFrom : 0), held: s.on || s.settledAt === null };
}

/** called on every feed build: tracks how long the bracket scene has been up and returns what the zoom toggle shows */
export function bracketZoom(matchId: string, bracket: boolean, reveal: boolean, fixture: boolean, now: number) {
  const k = editionKey(matchId);  if (!bracket) {
    store.delete(k);
    return null;
  }
  let s = store.get(k);
  if (!s) store.set(k, (s = { since: now, revealAt: reveal ? null : now, on: false, toggledAt: 0, settledAt: 0, paused: 0, pauseFrom: null }));
  tick(s, now, reveal);
  if (!fixture || s.revealAt === null) return null;
  return { on: s.on, settled: s.settledAt !== null };
}

export function setZoom(matchId: string, on: boolean) {
  const s = store.get(editionKey(matchId));  if (!s || s.revealAt === null || s.settledAt === null || s.on === on) return false;
  const now = Date.now();
  s.on = on;
  s.toggledAt = now;
  s.settledAt = null;
  if (on && s.pauseFrom === null) s.pauseFrom = now;
  return true;
}

/** an overlay finished the reveal or a zoom; reports earlier than the animation could possibly end are ignored */
export function overlaySettled(matchId: string, kind: "reveal" | "zoom", on?: boolean) {
  const s = store.get(editionKey(matchId));
  if (!s) return;
  const now = Date.now();
  if (kind === "reveal" && s.revealAt === null && now >= s.since + REVEAL_MIN) s.revealAt = now;
  if (kind === "zoom" && on === s.on && now >= s.toggledAt + REVEAL.zoom) settle(s, now);
}
