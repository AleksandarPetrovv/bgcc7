"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Hourglass, X } from "lucide-react";
import { useDict } from "./lang";

const KEY = "bgcc7-flash";
const DELAY_MS = 300;
const LIFE_MS = 5000;

export function flashSignedUp() {
  try {
    sessionStorage.setItem(KEY, "signedUp");
  } catch {}
}

export function Flash() {
  const t = useDict();
  const path = usePathname();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let due = false;
    try {
      due = sessionStorage.getItem(KEY) === "signedUp";
      sessionStorage.removeItem(KEY);
    } catch {}
    if (!due) return;
    const show = setTimeout(() => setShown(true), DELAY_MS);
    const hide = setTimeout(() => setShown(false), DELAY_MS + LIFE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [path]);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md"
          role="status"
        >
          <div className="relative overflow-hidden border-2 border-balkan bg-coal p-5 pr-12 shadow-[6px_6px_0_0_var(--balkan-deep)]">
            <span className="anim-twinkle absolute right-10 top-3 text-sm text-balkan-hi" aria-hidden>
              ✦
            </span>
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-balkan/15 text-balkan-hi">
                <Hourglass className="anim-bob size-5" />
              </span>
              <div className="min-w-0">
                <div className="heading-slam text-2xl leading-tight">{t.register.flashTitle}</div>
                <p className="mt-1 text-sm text-paper/80">{t.register.flashText}</p>
              </div>
            </div>
            <button type="button" onClick={() => setShown(false)} aria-label={t.common.close} className="absolute right-2 top-2 p-2 text-ash transition-colors hover:text-paper">
              <X className="size-4" />
            </button>
            <motion.span
              className="absolute inset-x-0 bottom-0 h-1 origin-left bg-balkan"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: LIFE_MS / 1000, ease: "linear" }}
              aria-hidden
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
