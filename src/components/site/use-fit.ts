"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function useFit(width: number, from = 768) {
  const ref = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAvail(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = avail >= from && width > avail ? avail / width : 1;
  return { ref, avail, scale };
}

export const fitBox = (width: number, height: number, scale: number) =>
  scale < 1
    ? { outer: { width: width * scale, height: height * scale }, inner: { width, height, transform: `scale(${scale})`, transformOrigin: "top left" } }
    : { outer: undefined, inner: { width, height } };
