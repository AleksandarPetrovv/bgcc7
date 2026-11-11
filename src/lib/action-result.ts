import type { Dict } from "./i18n/dict";

export type ActionError = "forbidden" | "notFound" | "invalid" | "note" | "lastHost" | "taken" | "oneEach" | "dupe" | "stale" | "wrongCode" | "locked";
export type ActionResult = { ok: boolean; error?: ActionError } | null;

const TEXT: Partial<Record<ActionError, (t: Dict) => string>> = {
  notFound: (t) => t.admin.notFound,
  lastHost: (t) => t.admin.lastHost,
  taken: (t) => t.admin.taken,
  oneEach: (t) => t.admin.oneEach,
  dupe: (t) => t.admin.dupeMap,
  stale: (t) => t.admin.stale,
  note: (t) => t.admin.denyNote,
  wrongCode: (t) => t.admin.refApp.wrongCode,
  locked: (t) => t.admin.refApp.locked,
};

export const errorText = (t: Dict, error?: ActionError) => (error && TEXT[error]?.(t)) || t.admin.error;
