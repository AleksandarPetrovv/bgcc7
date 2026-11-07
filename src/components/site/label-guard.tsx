"use client";

import { useEffect } from "react";

// fields wrap their caption in a <label>, and a click anywhere on a label activates its field.
// only a click on the field itself should; checkbox / radio rows stay clickable as a whole
const SELF = "input, select, textarea, button, a, [role=group], [contenteditable], .adm-field";

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
