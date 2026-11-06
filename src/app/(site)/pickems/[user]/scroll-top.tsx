"use client";

import { useLayoutEffect } from "react";

// runs when the new page commits, so the old page never shows scrolled to the top
export function ScrollTop() {
  useLayoutEffect(() => window.scrollTo({ top: 0 }), []);
  return null;
}
