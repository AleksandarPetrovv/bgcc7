// the site <-> BGCC7 Helper wire contract. installed helpers don't update with the site, so paths, field names,
// status codes and frames only ever grow. helper/contract/fixture.json holds one example of each message:
// scripts/relay-contract.check.mjs checks it against this file, `cargo test` in helper/src-tauri against the Rust structs.
// the helper's site url is baked in at build time: helper/src-tauri/build.rs reads PUBLIC_URL (env or host/.env),
// the same value lib/links.ts siteUrl() falls back to at runtime.
// no imports: the helper UI bundles parts of this file.

/** every relay response with an `error` field, and the status it goes out with; the helper reacts to the status */
export const RELAY_ERR = {
  invalid: 400,
  unpaired: 401,
  /** /claim: the account behind the code has no user row */
  wrongname: 403,
  /** /in: no ref role */
  noref: 403,
  /** /score: no streaming role */
  nostream: 403,
  /** /stream: neither role */
  noroles: 403,
  /** /in: this helper has no open /stream to feed */
  norelay: 409,
  /** /score: no match assigned to this streamer */
  nomatch: 409,
  /** /start: too many pending codes */
  busy: 503,
} as const;
export type RelayError = keyof typeof RELAY_ERR;
export const relayError = (error: RelayError | LiveReject, extra?: Record<string, unknown>) =>
  Response.json({ error, ...extra }, { status: error in RELAY_ERR ? RELAY_ERR[error as RelayError] : LIVE_REJECT_STATUS });

// pairing: POST /start {state} -> {code}; POST /claim {state} -> 202 {pending:true} | 200 {token,name} | 403 wrongname
/** the helper sends 32 random bytes as unpadded base64url (43 chars) */
export const validState = (st: string) => /^[A-Za-z0-9_-]{32,64}$/.test(st);
/** pairing codes expire after this, and too many wrong codes lock linking for as long */
export const LINK_TTL = 10 * 60_000;
/** the helper polls /claim this often, this many times (together LINK_TTL) */
export const CLAIM_POLL_MS = 3000;
export const CLAIM_POLLS = 200;
export const startRes = (code: string) => ({ code });
export const claimRes = (token: string, name: string) => ({ token, name });
export const CLAIM_PENDING = { pending: true } as const;

/** GET /api/relay/me, the helper's role + alerts poll */
export type RelayMe = { id: number; name: string; ref: boolean; stream: boolean; alerts: Alert[] };
export const relayMe = (id: number, name: string, a: { ref: boolean; stream: boolean }, alerts: Alert[]): RelayMe => ({ id, name, ref: a.ref, stream: a.stream, alerts });
/** the helper polls /me this often once roles are known (5s before), so the site counts it running for APP_SEEN_MS */
export const ME_POLL_MS = 20_000;
export const APP_SEEN_MS = 45_000;
/** the helper raises siteDown after /me fails this long */
export const SITE_DOWN_AFTER = 60_000;

/** site -> helper: `data: <json>\n\n` frames on GET /api/relay/stream, with `: ping` comments every SSE_PING_MS */
export type RelayMsg = { t: "open" } | { t: "line"; l: string } | { t: "close" };
/** first frame of every stream; the current helper ignores it, older installs read `id` */
export type RelayHello = { t: "hello"; name: string; id: number };
export type RelayAlerts = { t: "alerts"; alerts: Alert[] };
export type RelayFrame = RelayMsg | RelayHello | RelayAlerts;
export const frame = {
  open: (): RelayMsg => ({ t: "open" }),
  line: (l: string): RelayMsg => ({ t: "line", l }),
  close: (): RelayMsg => ({ t: "close" }),
  hello: (name: string, id: number): RelayHello => ({ t: "hello", name, id }),
  alerts: (alerts: Alert[]): RelayAlerts => ({ t: "alerts", alerts }),
};
export const sseFrame = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;
export const SSE_PING_MS = 15_000;
/** a helper restart takes a few seconds; the site waits this long before calling it offline */
export const OFFLINE_GRACE = 20_000;

/** helper -> site: POST /api/relay/in {ev: RelayEv[]} */
export type RelayEv = { t: "opened" } | { t: "line"; l: string } | { t: "closed"; why?: string };
/** the site keeps this many events per post, the helper batches at most RELAY_IN_BATCH */
export const RELAY_IN_MAX = 500;
export const RELAY_IN_BATCH = 300;
export const RELAY_LINE_MAX = 4095;
export const validEv = (e: unknown): e is RelayEv => {
  const x = e as RelayEv | null;
  return !!x && (x.t === "opened" || x.t === "closed" || (x.t === "line" && typeof x.l === "string" && x.l.length <= RELAY_LINE_MAX));
};

export type LiveClient = {
  ipcId: number;
  team: "left" | "right";
  userId: number;
  name: string;
  score: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
  mods: string[];
  failed: boolean;
};

/** helper -> site: POST /api/relay/score, on change and every SCORE_KEEPALIVE_MS */
export type ScorePacket = {
  ipcState: number;
  mapId: number;
  clients: LiveClient[];
};
/** the site rejects outside these; the helper clamps to them */
export const SCORE_LIMITS = { ipcStateMax: 10, clients: 16, nameUnits: 32, mods: 16, scoreMax: 2147483647, accuracyMax: 100 } as const;
export const IPC_PLAYING = 3;
/** a live score or reject counts for this long; the helper resends unchanged packets every SCORE_KEEPALIVE_MS */
export const LIVE_STALE_MS = 10_000;
export const SCORE_KEEPALIVE_MS = 2000;
/** /score 409 {error, match}: the lobby doesn't fit the streamer's match. the helper shows each by name */
export const LIVE_REJECTS = ["noplayers", "players", "swapped", "map"] as const;
export type LiveReject = (typeof LIVE_REJECTS)[number];
const LIVE_REJECT_STATUS = 409;
export const scoreOk = (match: string) => ({ ok: true, match });

const isInt = (x: unknown, min = 0, max = Infinity): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const isNum = (x: unknown, min: number, max: number): x is number => typeof x === "number" && isFinite(x) && x >= min && x <= max;

export function parseScore(b: unknown): ScorePacket | null {
  if (!b || typeof b !== "object") return null;
  const obj = b as Record<string, unknown>;
  if (!isInt(obj.ipcState, 0, SCORE_LIMITS.ipcStateMax) || !isInt(obj.mapId)) return null;
  if (!Array.isArray(obj.clients) || obj.clients.length > SCORE_LIMITS.clients) return null;
  const clients: LiveClient[] = [];
  for (const c of obj.clients) {
    if (!c || typeof c !== "object") return null;
    const x = c as Record<string, unknown>;
    if (!isInt(x.ipcId) || (x.team !== "left" && x.team !== "right") || !isInt(x.userId)) return null;
    if (typeof x.name !== "string" || x.name.length > SCORE_LIMITS.nameUnits) return null;
    if (!isNum(x.score, 0, SCORE_LIMITS.scoreMax) || !isNum(x.accuracy, 0, SCORE_LIMITS.accuracyMax)) return null;
    if (!isInt(x.combo) || !isInt(x.maxCombo) || typeof x.failed !== "boolean") return null;
    if (!Array.isArray(x.mods) || x.mods.length > SCORE_LIMITS.mods || !x.mods.every((m) => typeof m === "string" && /^[A-Z0-9]{2}$/.test(m))) return null;
    clients.push({ ipcId: x.ipcId, team: x.team, userId: x.userId, name: x.name, score: Math.floor(x.score), accuracy: x.accuracy, combo: x.combo, maxCombo: x.maxCombo, mods: [...(x.mods as string[])], failed: x.failed });
  }
  return { ipcState: obj.ipcState, mapId: obj.mapId, clients };
}

/** raised by the site, sent on /me and the stream's alerts frame */
export const ALERT_KINDS = ["ircLost", "helperOffline", "finishFailed", "bracketBlocked", "scoresStale", "overlayFailing"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];
/** the helper adds its own siteDown alert (id and kind "siteDown") when it can't reach the site */
export const HELPER_ALERT_KINDS = [...ALERT_KINDS, "siteDown"] as const;
export type HelperAlertKind = (typeof HELPER_ALERT_KINDS)[number];

export type Alert = {
  /** stable while the problem lasts, e.g. "ircLost:bgcc7:winners-r1-3:9123456"; snoozes are keyed on it */
  id: string;
  kind: AlertKind;
  /** red: a match is affected right now. gold: needs attention soon */
  level: "red" | "gold";
  /** ms epoch when the problem started */
  since: number;
  match?: { id: string; slug: string; label: string };
  /** raw error text, shown as the technical detail */
  detail?: string;
  /** where the popup's main button goes */
  href?: string;
  /** bracketBlocked: labels of the matches that block the correction */
  blocked?: string[];
};

export const isAlertOf =
  (kinds: readonly string[]) =>
  (value: unknown): value is Alert => {
    if (!value || typeof value !== "object") return false;
    const a = value as Alert;
    return typeof a.id === "string" && kinds.includes(a.kind) && (a.level === "red" || a.level === "gold") && typeof a.since === "number" && Number.isFinite(a.since);
  };
export const isAlert = isAlertOf(ALERT_KINDS);

/** the site and the helper snooze an alert for this long after X */
export const snoozeMs = (a: Pick<Alert, "level">) => (a.level === "red" ? 10 : 30) * 60_000;
/** live scores count as stale after failing to load for this long */
export const SCORES_STALE_AFTER = 2 * 60_000;
