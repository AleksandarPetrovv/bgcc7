"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { belowFold } from "./in-view";

export function Cascade({ className, step = 0.06, children }: { className?: string; step?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    [...root.querySelectorAll<HTMLElement>("[data-cascade]")]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)
      .forEach(({ el }, n) => {
        if (belowFold(el)) el.classList.add("no-intro");
        else el.style.setProperty("--i", String(n));
        el.classList.add("in");
      });
  }, []);
  return (
    <div ref={ref} className={cn(className)} style={{ "--s": `${step}s` } as React.CSSProperties}>
      {children}
    </div>
  );
}
