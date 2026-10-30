import { fmtSofia } from "./time";

/** how every discord message writes a match time */
export const when = (d: Date) => `${fmtSofia(d, "en-GB")} (BG time)`;
