export const ERR: Record<string, string> = {
  empty: "Enter your osu! username",
  badpass: "Wrong IRC username or password; get your IRC password from osu! settings",
  noirc: "Couldn't reach osu! IRC; check your internet and try again",
  keyring: "Couldn't save the password on this PC; try again",
  wrongname: "That osu! account doesn't match the username you entered",
  timeout: "Took too long; try linking again",
  unpaired: "Link your osu! account again",
  noref: "This account has no ref role",
  nostream: "This account has no streaming role",
  noroles: "This account has no ref or streaming role",
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

export const ALERT_TEXT: Record<string, { title: string; means: string; steps: string[]; button?: string }> = {
  ircLost: {
    title: "Lobby lost its osu! connection",
    means: "The site can't talk to the match lobby, so picks, bans and scores won't reach osu!. The lobby itself is still open in osu!.",
    steps: [
      "Close the osu! tournament client, it blocks the helper's login.",
      "Press Make lobby on the match page. It reconnects to the same lobby.",
      "Open the tournament client again once the lobby is back.",
    ],
    button: "Open match",
  },
  helperOffline: {
    title: "Your BGCC7 Helper is offline",
    means: "Your match lobby is open, but the site can't reach your helper, so the lobby can't be controlled from the site.",
    steps: ["Open BGCC7 Helper on your PC.", "Check it shows connected and you're signed in.", "Not installed? Download it with the button below."],
    button: "Download helper",
  },
  finishFailed: {
    title: "Match result wasn't saved",
    means: "The match reached its winning score, but saving the result failed, so the bracket didn't move on.",
    steps: ["Press Retry.", "If it fails again, set the score and winner by hand in Admin → Matches."],
    button: "Open match admin",
  },
  bracketBlocked: {
    title: "Bracket correction is blocked",
    means: "A changed result would put a different team into matches that are already played or in progress, so the bracket was left as it was.",
    steps: [
      "Check the matches listed below.",
      "If they really need to change, clear their result in Admin → Matches, then save the corrected match again.",
      "Otherwise put the old result back.",
    ],
    button: "Open matches",
  },
  scoresStale: {
    title: "Scores aren't updating",
    means: "The site hasn't been able to load this match's scores from osu! for over 2 minutes.",
    steps: ["Check the mp link on the match is right.", "osu! may be having API problems. Scores catch up on their own once it works again."],
    button: "Open match admin",
  },
  overlayFailing: {
    title: "Stream overlay isn't updating",
    means: "The overlay's data feed has been failing for over a minute, so the stream may show old info.",
    steps: ["Refresh the browser source in OBS.", "Check the scene in Admin → Stream."],
    button: "Open stream admin",
  },
  siteDown: {
    title: "Can't reach the site",
    means: "The helper hasn't reached the site for over a minute.",
    steps: ["The osu! lobby keeps running, keep refereeing in osu! directly.", "Check this PC's internet.", "Picks and scores can be fixed on the site once it's back."],
  },
};
