"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const GAP = 24;
// distance between page starts, measured so it matches the real layout (fractional widths)
const stride = (el: HTMLElement) => {
  const k = el.children as HTMLCollectionOf<HTMLElement>;
  return k.length > 1 ? k[1].offsetLeft - k[0].offsetLeft : el.clientWidth + GAP;
};
const ease = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

// one skill group per page, snapping a whole page per swipe; the tab bar slides with the scroll like the main nav
export function PoolPager({ pages }: { pages: { name: string; color: string; node: React.ReactNode }[] }) {
  const box = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const anim = useRef(0);
  const [pos, setPos] = useState(0);
  const [rects, setRects] = useState<{ l: number; w: number }[]>([]);

  useEffect(() => {
    const measure = () => setRects(tabs.current.map((b) => ({ l: b?.offsetLeft ?? 0, w: b?.offsetWidth ?? 0 })));
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(anim.current);
    };
  }, []);

  // own eased scroll instead of the browser's smooth one; snapping is paused so it doesn't fight the animation
  const go = (i: number) => {
    const el = box.current;
    if (!el) return;
    cancelAnimationFrame(anim.current);
    const from = el.scrollLeft;
    const to = Math.min(i * stride(el), el.scrollWidth - el.clientWidth);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.scrollLeft = to;
      return;
    }
    let t0 = -1;
    const dur = 520 + Math.min(3, Math.abs(to - from) / stride(el)) * 90;
    el.style.scrollSnapType = "none";
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const k = Math.min(1, (now - t0) / dur);
      el.scrollLeft = from + (to - from) * ease(k);
      if (k < 1) anim.current = requestAnimationFrame(step);
      else el.style.scrollSnapType = "";
    };
    anim.current = requestAnimationFrame(step);
  };

  const i0 = Math.max(0, Math.min(pages.length - 1, Math.floor(pos)));
  const i1 = Math.min(pages.length - 1, i0 + 1);
  const f = pos - i0;
  const a = rects[i0];
  const b = rects[i1];
  const on = Math.round(pos);

  return (
    <div>
      <div className="in-up relative mt-5 flex gap-x-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" style={{ "--d": "1.55s" } as React.CSSProperties}>
        {pages.map((p, i) => (
          <button
            key={p.name}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            aria-selected={on === i}
            onClick={() => go(i)}
            className={cn("shrink-0 whitespace-nowrap pb-2 font-display uppercase text-sm font-black transition-colors duration-300", on === i ? "text-paper" : "text-ash hover:text-paper/80")}
          >
            {p.name}
          </button>
        ))}
        {a && b && (
          <span
            className="pointer-events-none absolute bottom-0 left-0 h-[3px] -skew-x-12"
            style={{
              width: a.w + (b.w - a.w) * f,
              translate: `${a.l + (b.l - a.l) * f}px 0`,
              background: `color-mix(in oklab, ${pages[i0].color} ${(1 - f) * 100}%, ${pages[i1].color})`,
            }}
            aria-hidden
          />
        )}
      </div>
      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPos(el.scrollLeft / stride(el));
        }}
        style={{ columnGap: GAP }}
        className="mt-4 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((p) => (
          <div key={p.name} className="w-full shrink-0 snap-start snap-always">
            {p.node}
          </div>
        ))}
      </div>
    </div>
  );
}
