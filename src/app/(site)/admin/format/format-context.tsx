"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { SubcategoryGroup } from "@/lib/format-plan";

export const Edit = createContext(false);
export const Catalog = createContext<SubcategoryGroup[]>([]);
export const Intro = createContext(false);

export function useIntroWindow(ms = 1000) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return on;
}

export function useFresh() {
  const intro = useContext(Intro);
  return useState(intro)[0];
}
