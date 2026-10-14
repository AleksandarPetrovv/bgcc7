export const ALERT_KINDS = ["ircLost", "helperOffline", "finishFailed", "bracketBlocked", "scoresStale", "overlayFailing"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export type Alert = {
  /** stable while the problem lasts, e.g. "ircLost:ro16-3"; snoozes are keyed on it */
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

/** the site and the helper snooze an alert for this long after X */
export const snoozeMs = (a: Pick<Alert, "level">) => (a.level === "red" ? 10 : 30) * 60_000;
