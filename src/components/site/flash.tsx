"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Hourglass, X } from "lucide-react";
import { useDict } from "./lang";

const KEY = "bgcc7-flash";

export function setFlash(kind: string) {
  try {
    sessionStorage.setItem(KEY, kind);
  } catch {}
}

export function Flash() {
  const t = useDict();
  const path = usePathname();
  const [kind, setKind] = useState<string | null>(null);

  useEffect(() => {
    let k: string | null = null;
    try {
      k = sessionStorage.getItem(KEY);
      if (k) sessionStorage.removeItem(KEY);
    } catch {}
    if (!k) return;
    const show = setTimeout(() => setKind(k), 300);
    const hide = setTimeout(() => setKind(null), 5300);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [path]);

  return (
    <AnimatePresence>
      {kind === "signedUp" && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md"
          role="status"
        >
          <div className="relative overflow-hidden border-2 border-balkan bg-coal p-5 pr-12 shadow-[6px_6px_0_0_var(--color-balkan-deep)]">
            <span className="anim-twinkle absolute right-10 top-3 text-sm text-balkan" aria-hidden>
              ✦
            </span>
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-balkan/15 text-balkan">
                <Hourglass className="anim-bob size-5" />
              </span>
              <div className="min-w-0">
                <div className="heading-slam text-2xl leading-tight">{t.register.flashTitle}</div>
                <p className="mt-1 text-sm text-paper/80">{t.register.flashText}</p>
              </div>
            </div>
            <button type="button" onClick={() => setKind(null)} aria-label={t.draft.close} className="absolute right-2 top-2 p-2 text-ash transition-colors hover:text-paper">
              <X className="size-4" />
            </button>
            <motion.span
              className="absolute inset-x-0 bottom-0 h-1 origin-left bg-balkan"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: "linear" }}
              aria-hidden
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
