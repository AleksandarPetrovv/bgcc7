"use client";

import { useEffect, useRef } from "react";
import { fontsReady } from "@/lib/fonts-ready";

export function HeroGate({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const ready = () => ref.current?.setAttribute("data-ready", "");
    fontsReady().then(() => requestAnimationFrame(() => requestAnimationFrame(ready)));
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
