"use client";

import { useRefreshWhile } from "@/components/site/use-poll-refresh";

// no stream pushes live scores, so re-render the page while a match is live
export function RefreshWhileLive({ active = true }: { active?: boolean }) {
  useRefreshWhile(active, 30_000);
  return null;
}
