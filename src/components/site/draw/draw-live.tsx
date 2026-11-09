"use client";

import { useEffect, useRef, useState } from "react";
import type { DrawFeed } from "@/lib/draw";
import { useSSE } from "@/components/site/use-sse";
import { DrawStage } from "./draw-stage";

/** the live draw over /api/draw, or `closed` outside the draw phase. `onFeed` and `onIdle` let the admin controls follow it */
export function DrawLive({ initial, closed, wordmark, admin, thanks, onFeed, onIdle }: { initial: DrawFeed; closed: React.ReactNode; wordmark?: boolean; admin?: boolean; thanks?: React.ReactNode; onFeed?: (f: DrawFeed) => void; onIdle?: (idle: boolean) => void }) {
  const [feed, setFeed] = useState(initial);
  const [fresh, setFresh] = useState(0);
  // the page and the stream are separate server bundles, so only builds seen on the stream are compared
  const build = useRef<string | null>(null);
  // a tab hidden mid-animation (admin switching away, a background /draw) skips what it misses: it starts fresh at the latest state
  const playing = useRef(false);
  const idleCb = useRef(onIdle);
  useEffect(() => {
    idleCb.current = onIdle;
  });
  const idle = (v: boolean) => {
    playing.current = !v;
    idleCb.current?.(v);
  };
  useEffect(() => {
    const away = () => {
      if (!document.hidden || !playing.current) return;
      setFresh((n) => n + 1);
      playing.current = false;
      idleCb.current?.(true);
    };
    document.addEventListener("visibilitychange", away);
    return () => document.removeEventListener("visibilitychange", away);
  }, []);
  useSSE("/api/draw", (data) => {
    try {
      const next: DrawFeed = JSON.parse(data);
      // a deploy or a phase switch: OBS has nobody to click, so the page reloads on its own
      if ((build.current && next.build !== build.current) || next.open !== initial.open) return window.location.reload();
      build.current = next.build;
      if (document.hidden) setFresh((n) => n + 1);
      setFeed(next);
      onFeed?.(next);
    } catch (e) {
      console.warn("draw frame dropped", e);
    }
  });
  return feed.open ? <DrawStage key={fresh} feed={feed} wordmark={wordmark} admin={admin} thanks={thanks} onIdle={idle} /> : closed;
}
