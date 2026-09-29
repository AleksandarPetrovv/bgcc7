"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function InView({
  as: Tag = "div",
  className,
  style,
  self,
  scrub,
  children,
}: {
  as?: "div" | "ul" | "ol" | "section" | "li" | "article";
  className?: string;
  style?: React.CSSProperties;
  self?: boolean;
  scrub?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"" | "in" | "live">("");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (scrub && CSS.supports("animation-timeline: view()") && el.getBoundingClientRect().top > window.innerHeight) {
      setState("live");
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setState((s) => s || "in");
      io.disconnect();
    });
    io.observe(el);
    const fallback = setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) setState((s) => s || "in");
    }, 1500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, [scrub]);
  return (
    <Tag ref={ref as React.Ref<never>} className={cn("iv", self && "iv-self", state && "in", state === "live" && "sr-live", className)} style={style}>
      {children}
    </Tag>
  );
}
