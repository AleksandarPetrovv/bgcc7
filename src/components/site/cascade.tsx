"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Cascade({ className, step = 0.06, children }: { className?: string; step?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>("[data-cascade]")];
    const reveal = (els: HTMLElement[]) => {
      els
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)
        .forEach(({ el }, n) => {
          el.style.setProperty("--i", String(n));
          el.classList.add("in");
          io.unobserve(el);
        });
    };
    const io = new IntersectionObserver((entries) => reveal(entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement)));
    items.forEach((el) => io.observe(el));
    const fallback = setTimeout(() => reveal(items.filter((el) => !el.classList.contains("in") && el.getBoundingClientRect().top < window.innerHeight)), 1500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);
  return (
    <div ref={ref} className={cn(className)} style={{ "--s": `${step}s` } as React.CSSProperties}>
      {children}
    </div>
  );
}
