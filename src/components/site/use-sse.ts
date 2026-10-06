"use client";

import { useEffect, useRef } from "react";

export function useSSE(url: string, onData: (data: string) => void, onState?: (online: boolean) => void) {
  const data = useRef(onData);
  const state = useRef(onState);
  useEffect(() => {
    data.current = onData;
    state.current = onState;
  });
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let wait = 1000;
    let dead = false;
    const open = () => {
      if (dead) return;
      es = new EventSource(url);
      es.onmessage = (e) => {
        wait = 1000;
        state.current?.(true);
        data.current(e.data);
      };
      es.onerror = () => {
        state.current?.(false);
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          retry = setTimeout(open, wait);
          wait = Math.min(wait * 2, 8000);
        }
      };
    };
    const wake = () => {
      if (document.visibilityState === "visible" && es?.readyState === EventSource.CLOSED) {
        clearTimeout(retry);
        wait = 1000;
        open();
      }
    };
    open();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      dead = true;
      clearTimeout(retry);
      es?.close();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [url]);
}
