"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useMeasure } from "@/lib/use-measure";
import { Sparkle } from "./graphics";

const GAP = 24;
// distance between page starts, measured so it matches the real layout (fractional widths)
const stride = (el: HTMLElement) => {
  const k = el.children as HTMLCollectionOf<HTMLElement>;
  return k.length > 1 ? k[1].offsetLeft - k[0].offsetLeft : el.clientWidth + GAP;
};
const ease = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

export function UnderlineTabs({ names, colors, pos, onPick, animate, spark, className, style }: { names: string[]; colors: string[]; pos: number; onPick: (i: number) => void; animate?: boolean; spark?: boolean; className?: string; style?: React.CSSProperties }) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rects, setRects] = useState<{ l: number; w: number }[]>([]);
  const key = names.join("|");
  useMeasure(() => setRects(tabs.current.map((b) => ({ l: b?.offsetLeft ?? 0, w: b?.offsetWidth ?? 0 }))), [key]);

  const i0 = Math.max(0, Math.min(names.length - 1, Math.floor(pos)));
  const i1 = Math.min(names.length - 1, i0 + 1);
  const f = pos - i0;
  const a = rects[i0];
  const b = rects[i1];
  const on = Math.round(pos);
  const x = a && b ? a.l + (b.l - a.l) * f : 0;
  const w = a && b ? a.w + (b.w - a.w) * f : 0;
  const slide = animate ? "translate 520ms cubic-bezier(0.65,0,0.35,1), width 520ms cubic-bezier(0.65,0,0.35,1), background-color 520ms" : undefined;

  return (
    <div className={cn("relative flex gap-x-5 overflow-x-auto pt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)} role="tablist" style={style}>
      {names.map((n, i) => (
        <button
          type="button"
          key={n}
          ref={(el) => {
            tabs.current[i] = el;
          }}
          role="tab"
          aria-selected={on === i}
          onClick={() => onPick(i)}
          className={cn("shrink-0 whitespace-nowrap pb-2 font-display text-sm font-black transition-colors duration-300", on === i ? "text-paper" : "text-ash hover:text-paper/80")}
        >
          {n}
        </button>
      ))}
      {a && b && (
        <>
          <span
            className="pointer-events-none absolute bottom-0 left-0 h-[3px] -skew-x-12"
            style={{ width: w, translate: `${x}px 0`, transition: slide, background: animate ? colors[on] : `color-mix(in oklab, ${colors[i0]} ${(1 - f) * 100}%, ${colors[i1]})` }}
            aria-hidden
          />
          {spark && <span className="pointer-events-none absolute left-0 top-0 size-3" style={{ translate: `${x + w - 4}px 0`, transition: slide }} aria-hidden>
            <Sparkle className="inset-0 size-full text-rose-hi" />
          </span>}
        </>
      )}
    </div>
  );
}

export function PoolPager({ pages }: { pages: { name: string; color: string; node: React.ReactNode }[] }) {
  const box = useRef<HTMLDivElement>(null);
  const anim = useRef(0);
  const [pos, setPos] = useState(0);

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

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

  return (
    <div>
      <UnderlineTabs names={pages.map((p) => p.name)} colors={pages.map((p) => p.color)} pos={pos} onPick={go} className="in-up mt-5" style={{ "--d": "1.55s" } as React.CSSProperties} />
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
