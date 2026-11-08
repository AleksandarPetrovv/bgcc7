"use client";

import { useEffect } from "react";

// a click on a field's <label> caption must only activate the field when it hits the field itself; custom widgets mark their box with `data-field`
const SELF = "input, select, textarea, button, a, [contenteditable], [data-field]";

export function LabelGuard() {
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const el = e.target as Element | null;
      const label = el?.closest?.("label");
      if (!label || el!.closest(SELF) || label.querySelector("input[type=checkbox], input[type=radio]")) return;
      e.preventDefault();
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, []);
  return null;
}
