"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useMeasure } from "@/lib/use-measure";
import { cn } from "@/lib/utils";

/** shows the longest of `labels` (longest first, e.g. `cardLabels`) that fits its row; only the shortest truncates */
export function FitLabel({ labels, className }: { labels: string[]; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [level, setLevel] = useState(0);
  const key = labels.join("\n");
  const pick = () => {
    const el = ref.current;
    if (!el) return;
    const r = document.createRange();
    let i = 0;
    for (; i < labels.length - 1; i++) {
      el.textContent = labels[i];
      r.selectNodeContents(el);
      // text width vs the span's content box: scrollWidth rounds and misses sub-pixel overflow that still shows an ellipsis
      if (r.getBoundingClientRect().width <= el.getBoundingClientRect().width - parseFloat(getComputedStyle(el).paddingRight) + 0.5) break;
    }
    el.textContent = labels[i];
    setLevel(i);
  };
  useMeasure(pick, [key]);
  // a row sized by script (the bracket's boxes) changes without a window resize
  useLayoutEffect(() => {
    const row = ref.current?.parentElement;
    if (!row) return;
    const ro = new ResizeObserver(pick);
    ro.observe(row);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <span ref={ref} className={cn("min-w-0 truncate", className)}>
      {labels[Math.min(level, labels.length - 1)]}
    </span>
  );
}
