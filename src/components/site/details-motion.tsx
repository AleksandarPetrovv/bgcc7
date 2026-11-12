"use client";

import { useEffect } from "react";

const DUR = 450;
const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";
// the intro classes from motion.css
const INTRO = ".in-up, .in-left, .in-right, .in-drop, .in-pop, .in-flip, .in-spin, .in-wipe, .in-wipe-r, .in-grow, .in-draw, .in-left-far, .in-right-far, .in-slam, .in-launch, .in-grow-y, .in-stitch, .in-sweep";

export function DetailsMotion() {
  useEffect(() => {
    const running = new WeakMap<HTMLDetailsElement, { a: Animation; opening: boolean; out: Animation[] }>();
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
      const opening = prev ? !prev.opening : !d.open;
      prev?.a.cancel();
      prev?.out.forEach((x) => x.cancel());
      d.open = true;
      const cs = getComputedStyle(d);
      const closed = summary.getBoundingClientRect().height + (d.offsetHeight - d.clientHeight) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      // the open box itself: scrollHeight would add whatever hangs below it (a rule's diamond) and end in a jump
      const to = opening ? d.getBoundingClientRect().height : closed;
      // cut only below the box and what hangs under it: slanted edges poke past the sides, a map cover reaches above the top
      d.style.clipPath = `inset(-100vh -100vw ${d.clientHeight - d.scrollHeight}px)`;
      // clip-path makes the box its own layer: without this the next sibling paints over what hangs below
      d.style.zIndex = "1";
      // the content fades out ahead of the closing edge instead of being wiped by it
      const out = opening ? [] : [...d.children].filter((el) => el !== summary).map((el) => el.animate({ opacity: [1, 0] }, { duration: DUR * 0.6, easing: EASING, fill: "forwards" }));
      // replay the content's intros on every open (they already ran while it was collapsed)
      if (opening && !prev) {
        const els = [...d.querySelectorAll<HTMLElement>(INTRO)].filter((el) => !summary.contains(el));
        for (const el of els) el.style.animation = "none";
        void d.offsetHeight;
        for (const el of els) el.style.animation = "";
      }
      const a = d.animate({ height: [`${from}px`, `${to}px`] }, { duration: DUR, easing: EASING });
      running.set(d, { a, opening, out });
      a.onfinish = () => {
        if (!opening) d.open = false;
        out.forEach((x) => x.cancel());
        d.style.clipPath = "";
        d.style.zIndex = "";
        running.delete(d);
      };
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}
