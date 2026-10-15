import type { ChatLine } from "./bancho";

const KEEP = /^(Match starts in|Queued the match to start|The match has started|Started the match|Good luck|Aborted the match|The match has finished|Countdown ends in|Countdown finished|Countdown aborted|Changed beatmap to|Enabled .*FreeMod|Changed match host)/i;
const SHOW_CMD = /^!mp (start|timer|aborttimer|abort)\b/i;

export const visibleChatLine = (line: ChatLine) =>
  line.text.startsWith("!") ? SHOW_CMD.test(line.text) : !!(line.local || line.ref || line.from !== "BanchoBot" || KEEP.test(line.text));
