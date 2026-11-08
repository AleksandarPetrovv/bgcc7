"use client";

import { useEffect } from "react";
import { fontsReady } from "@/lib/fonts-ready";

// numbers the rendered lines of [data-lines] text (--ln per word); runs before HeroGate starts the intro
export function LineIndex() {
  useEffect(() => {
    fontsReady().then(() => {
      for (const box of document.querySelectorAll<HTMLElement>("[data-lines]")) {
        let top = -1;
        let ln = -1;
        for (const w of box.querySelectorAll<HTMLElement>(".word")) {
          if (Math.abs(w.offsetTop - top) > 4) {
            top = w.offsetTop;
            ln++;
          }
          w.style.setProperty("--ln", String(ln));
        }
      }
    });
  }, []);
  return null;
}
