"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const belowFold = (el: Element) => el.getBoundingClientRect().top >= window.innerHeight;

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
  scrub?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"" | "in" | "skip">("");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (belowFold(el)) {
      setState("skip");
      return;
    }
    setState("in");
  }, []);
  return (
    <Tag ref={ref as React.Ref<never>} className={cn("iv", self && "iv-self", state && "in", state === "skip" && "no-intro", className)} style={style}>
      {children}
    </Tag>
  );
}
