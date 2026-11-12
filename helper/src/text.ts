import { alertText } from "../../src/lib/i18n/en/alerts";
import { SITE_DOWN_AFTER, type AlertKind, type HelperAlertKind } from "../../src/lib/relay-contract";

const downMinutes = SITE_DOWN_AFTER / 60_000;
const downFor = downMinutes === 1 ? "a minute" : `${downMinutes} minutes`;

export const ERR: Record<string, string> = {
  badpass: "Wrong IRC username or password; get your IRC password from osu! settings",
  noirc: "Couldn't reach osu! IRC; check your internet and try again",
  keyring: "Couldn't save the password on this PC; try again",
  wrongname: "Couldn't find your osu! account on the site; log in there and link again",
  timeout: "Took too long; try linking again",
  nosite: "Couldn't reach the site; check your internet and try again",
  unpaired: "Link your osu! account again",
};
export const errorText = (e: unknown) => ERR[String(e)] ?? "Couldn't complete the action; try again and check the activity log";

type Dot = "" | "ok" | "wait" | "bad";
export const SITE: Record<string, [string, Dot]> = { off: ["Disconnected", "bad"], connecting: ["Connecting", "wait"], online: ["Connected", "ok"] };
export const IRC: Record<string, [string, Dot]> = { idle: ["Not connected", ""], connecting: ["Connecting", "wait"], online: ["Connected", "ok"], badpass: ["Wrong password", "bad"] };
export const STREAM: Record<string, [string, Dot, string]> = {
  off: ["Off", "", "Enable streaming to send live scores"],
  waiting: ["Awaiting client", "wait", "Open osu!tourney; streamers do not need IRC"],
  sending: ["Sending scores", "ok", "Live scores are reaching the site"],
  nomatch: ["Awaiting match", "wait", "Waiting for a match assignment on the site"],
  noplayers: ["Awaiting players", "wait", "No players are in the tourney client yet"],
  players: ["Wrong players", "bad", "A player in the lobby isn't on either team of your match"],
  swapped: ["Teams reversed", "bad", "Team 1 must be red and team 2 blue in the lobby, ask the ref to swap them"],
  map: ["Wrong map", "bad", "The map being played isn't in this match's pool"],
  forbidden: ["Access denied", "bad", "This account needs a streaming role on the site"],
  unpaired: ["Account unlinked", "bad", "Link your osu! account again to send scores"],
  error: ["Streaming error", "bad", "Check your internet and the activity log"],
};

// alert texts come from the site; the buttons are the helper's own (it has no retry, so finishFailed opens the match admin)
const site = (kind: AlertKind, button: string) => ({ ...alertText[kind], button });
export const ALERT_TEXT: Record<HelperAlertKind, { title: string; means: string; steps: string[]; button?: string }> = {
  ircLost: site("ircLost", "Open match"),
  helperOffline: site("helperOffline", "Download helper"),
  helperOfflineHost: site("helperOfflineHost", "Open match admin"),
  finishFailed: site("finishFailed", "Open match admin"),
  bracketBlocked: site("bracketBlocked", "Open matches"),
  scoresStale: site("scoresStale", "Open match admin"),
  overlayFailing: site("overlayFailing", "Open stream admin"),
  lobbyClosed: site("lobbyClosed", "Open match"),
  streamerOffline: site("streamerOffline", "Download helper"),
  siteDown: {
    title: "Can't reach the site",
    means: `The helper hasn't reached the site for over ${downFor}.`,
    steps: ["The osu! lobby keeps running, keep refereeing in osu! directly.", "Check this PC's internet.", "Picks and scores can be fixed on the site once it's back."],
  },
};
