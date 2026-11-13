import type { Dict } from "./i18n/dict";
import { REF_EDIT_DAYS } from "./edit-lock";

export type ActionError = "forbidden" | "notFound" | "invalid" | "note" | "lastHost" | "taken" | "oneEach" | "dupe" | "stale" | "wrongCode" | "locked" | "tooOld" | "playsHere" | "helperOff" | "refreshFailed";
export type ActionResult = { ok: boolean; error?: ActionError; slot?: string } | null;

const TEXT: Partial<Record<ActionError, (t: Dict, slot?: string) => string>> = {
  forbidden: (t) => t.admin.notOpen,
  notFound: (t) => t.admin.notFound,
  lastHost: (t) => t.admin.lastHost,
  taken: (t) => t.admin.taken,
  oneEach: (t) => t.admin.oneEach,
  dupe: (t, slot) => (slot ? t.admin.dupeIn(slot) : t.admin.dupeMap),
  stale: (t) => t.admin.stale,
  note: (t) => t.admin.denyNote,
  wrongCode: (t) => t.admin.refApp.wrongCode,
  locked: (t) => t.admin.refApp.locked,
  playsHere: (t) => t.admin.staffPlaysHere,
  tooOld: (t) => t.admin.tooOld(REF_EDIT_DAYS),
  helperOff: (t) => t.admin.take.helperOff,
  refreshFailed: (t, slot) => {
    const [failed, total] = (slot ?? "").split("/").map(Number);
    return t.admin.bwsLock.refreshFailed(failed, total);
  },
};

export const errorText = (t: Dict, error?: ActionError, slot?: string) => (error && TEXT[error]?.(t, slot)) || t.admin.error;
