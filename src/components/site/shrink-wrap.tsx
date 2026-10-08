"use client";

import { useLayoutEffect, useRef } from "react";

export function ShrinkWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const fit = () => {
      el.style.width = "";
      if (!wide.matches) return;
      for (let i = 0; i < 2; i++) {
        const left = el.getBoundingClientRect().left;
        let right = left;
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (!n.textContent?.trim()) continue;
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) right = Math.max(right, r.right);
        }
        for (const b of el.querySelectorAll("a,button")) right = Math.max(right, b.getBoundingClientRect().right);
        if (right > left) el.style.width = `${Math.ceil(right - left) + 1}px`;
      }
    };
    fit();
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    wide.addEventListener("change", fit);
    return () => {
      window.removeEventListener("resize", fit);
      wide.removeEventListener("change", fit);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
