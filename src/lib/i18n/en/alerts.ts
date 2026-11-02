import { SCORES_STALE_AFTER, type AlertKind } from "../../relay-contract";

// the helper bundles these too (helper/src/text.ts), so only relative imports of import-free files
export const alertText = {
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
    steps: [
      "Open BGCC7 Helper on your PC.",
      "Check it shows connected and you're signed in.",
      "Not installed? Download it with the button below.",
    ],
    button: "Download helper",
  },
  finishFailed: {
    title: "Match result wasn't saved",
    means: "The match reached its winning score, but saving the result failed, so the bracket didn't move on.",
    steps: ["Press Retry.", "If it fails again, set the score and winner by hand in Admin → Matches."],
    button: "Retry",
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
    means: `The site hasn't been able to load this match's scores from osu! for over ${SCORES_STALE_AFTER / 60_000} minutes.`,
    steps: ["Check the mp link on the match is right.", "osu! may be having API problems. Scores catch up on their own once it works again."],
    button: "Open match admin",
  },
  overlayFailing: {
    title: "Stream overlay isn't updating",
    means: "The overlay's data feed has been failing for over a minute, so the stream may show old info.",
    steps: ["Refresh the browser source in OBS.", "Check the scene in Admin → Stream."],
    button: "Open stream admin",
  },
} satisfies Record<AlertKind, { title: string; means: string; steps: string[]; button: string }>;
