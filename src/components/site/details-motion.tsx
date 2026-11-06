"use client";

import { useEffect } from "react";

const DUR = 450;
const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

// every <details> on the site slides its height open and closed instead of snapping (js, so it works in every browser)
export function DetailsMotion() {
  useEffect(() => {
    const running = new WeakMap<HTMLDetailsElement, { a: Animation; opening: boolean }>();
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const target = e.target as Element | null;
      const summary = target?.closest("summary");
      const d = summary?.parentElement;
      if (!summary || !(d instanceof HTMLDetailsElement) || d.querySelector(":scope > summary") !== summary) return;
      const hit = target?.closest("a, button, input, select, textarea");
      if (hit && summary.contains(hit)) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      e.preventDefault();
      const from = d.getBoundingClientRect().height;
      const prev = running.get(d);
      // a click mid-animation reverses it from wherever it is
      const opening = prev ? !prev.opening : !d.open;
      prev?.a.cancel();
      d.open = true;
      const cs = getComputedStyle(d);
      const closed = summary.getBoundingClientRect().height + (d.offsetHeight - d.clientHeight) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const to = opening ? d.scrollHeight + (d.offsetHeight - d.clientHeight) : closed;
      d.style.overflow = "clip";
      const a = d.animate({ height: [`${from}px`, `${to}px`] }, { duration: DUR, easing: EASING });
      running.set(d, { a, opening });
      a.onfinish = () => {
        if (!opening) d.open = false;
        d.style.overflow = "";
        running.delete(d);
      };
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}
