"use client";

import { createContext } from "react";
import type { SubcategoryGroup } from "@/lib/format-plan";

export const Edit = createContext(false);
export const Catalog = createContext<SubcategoryGroup[]>([]);
