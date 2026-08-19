"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function InView({
  as: Tag = "div",
  className,
  style,
  self,
  children,
}: {
  as?: "div" | "ul" | "ol" | "section" | "li" | "article";
  className?: string;
  style?: React.CSSProperties;
  self?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      el.classList.add("in");
      io.disconnect();
    });
    io.observe(el);
    const fallback = setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
    }, 1500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);
  return (
    <Tag ref={ref as React.Ref<never>} className={cn("iv", self && "iv-self", className)} style={style}>
      {children}
    </Tag>
  );
}
