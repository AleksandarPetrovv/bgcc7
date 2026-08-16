"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function LiteSettle() {
  const path = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("lite")) return;
    html.classList.remove("settled");
    const t = setTimeout(() => html.classList.add("settled"), path === "/" ? 1800 : 1200);
    return () => clearTimeout(t);
  }, [path]);
  return null;
}
