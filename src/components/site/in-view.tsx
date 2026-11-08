"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const belowFold = (el: Element) => el.getBoundingClientRect().top >= window.innerHeight;

export function useIntroSkip(ref: React.RefObject<Element | null>) {
  const [skip, setSkip] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    if (ref.current) setSkip(belowFold(ref.current));
  }, [ref]);
  return skip;
}

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
  const skip = useIntroSkip(ref);
  return (
    <Tag ref={ref as React.Ref<never>} className={cn("iv", self && "iv-self", skip !== null && "in", skip && "no-intro", className)} style={style}>
      {children}
    </Tag>
  );
}
