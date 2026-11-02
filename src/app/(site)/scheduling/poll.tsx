"use client";

import { usePollRefresh } from "@/components/site/use-poll-refresh";
import { schedSig } from "./actions";

/** refreshes the page when the other team answers, proposes or edits availability */
export function SchedPoll({ sig }: { sig: string }) {
  usePollRefresh(sig, schedSig, 5000, "focus");
  return null;
}
