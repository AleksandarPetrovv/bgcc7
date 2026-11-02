"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** every `ms` (and on `wake`) fetches a signature while the tab is visible; refreshes the page data when it differs from the last one */
export function usePollRefresh(sig: string, sigFn: () => Promise<string | null | undefined>, ms: number, wake?: "focus" | "visible") {
  const router = useRouter();
  const last = useRef(sig);
  const fn = useRef(sigFn);
  useEffect(() => {
    last.current = sig;
  }, [sig]);
  useEffect(() => {
    fn.current = sigFn;
  });
  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden) return;
      busy = true;
      const s = await fn.current().catch(() => null);
      busy = false;
      if (s && s !== last.current) {
        last.current = s;
        router.refresh();
      }
    };
    const onVis = () => !document.hidden && tick();
    const id = setInterval(tick, ms);
    if (wake === "focus") window.addEventListener("focus", tick);
    if (wake === "visible") document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router, ms, wake]);
}
