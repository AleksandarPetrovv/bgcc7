"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, children, tone = "rose", className }: { open: boolean; onClose: () => void; children: React.ReactNode; tone?: "rose" | "gold" | "balkan"; className?: string }) {
  const t = useDict();
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (typeof document === "undefined") return null;
  const edge = { rose: "border-rose shadow-[6px_6px_0_0_var(--rose-deep)]", gold: "border-gold shadow-[6px_6px_0_0_var(--gold-deep)]", balkan: "border-balkan shadow-[6px_6px_0_0_var(--balkan-deep)]" }[tone];
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ y: 40, scale: 0.92 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className={cn("relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto border-2 bg-coal p-5 sm:p-6", edge, className)}
            role="dialog"
            aria-modal="true"
          >
            <button type="button" onClick={onClose} aria-label={t.draft.close} className="absolute right-2 top-2 p-2 text-ash hover:text-paper">
              <X className="size-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
