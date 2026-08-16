"use client";

import { useEffect, useRef } from "react";

export function HeroGate({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const ready = () => ref.current?.setAttribute("data-ready", "");
    const go = () => requestAnimationFrame(() => requestAnimationFrame(ready));
    const fallback = setTimeout(ready, 1200);
    (document.fonts?.ready ?? Promise.resolve()).then(go);
    return () => clearTimeout(fallback);
  }, []);
  return (
    <section ref={ref} className={`hero-gate ${className ?? ""}`}>
      {children}
      <noscript>
        <style>{".hero-gate *{animation-play-state:running!important}"}</style>
      </noscript>
    </section>
  );
}
