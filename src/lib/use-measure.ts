"use client";

import { useLayoutEffect } from "react";
import { fontsReady } from "@/lib/fonts-ready";

// runs fn now, when fonts are ready or finish loading, and on resize; stops after unmount
export function useMeasure(fn: () => void, deps: React.DependencyList) {
  useLayoutEffect(() => {
    let live = true;
    const run = () => {
      if (live) fn();
    };
    run();
    fontsReady().then(run);
    document.fonts?.addEventListener("loadingdone", run);
    window.addEventListener("resize", run);
    return () => {
      live = false;
      document.fonts?.removeEventListener("loadingdone", run);
      window.removeEventListener("resize", run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
