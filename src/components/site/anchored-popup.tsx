"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/ease";

/** viewport coords; `up` = opens above, `top` is then the edge it hangs from */
export type PopPlace = { left: number; top: number; width: number; up?: boolean };

const noop = () => () => {};

/** fixed position from the anchor rect (kept in place on scroll/resize), closes on outside press or Escape */
export function useAnchoredPopup(anchor: React.RefObject<HTMLElement | null>, open: boolean, onClose: () => void, place: (r: DOMRect) => PopPlace, box: React.RefObject<HTMLElement | null>) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [pos, setPos] = useState<PopPlace | null>(null);
  const cb = useRef({ onClose, place });
  useEffect(() => {
    cb.current = { onClose, place };
  });

  useLayoutEffect(() => {
    if (!open) return;
    const at = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (r) setPos(cb.current.place(r));
    };
    at();
    window.addEventListener("resize", at);
    window.addEventListener("scroll", at, true);
    return () => {
      window.removeEventListener("resize", at);
      window.removeEventListener("scroll", at, true);
    };
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const el = e.target as Node;
      if (!box.current?.contains(el) && !anchor.current?.contains(el)) cb.current.onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && cb.current.onClose();
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, anchor, box]);

  return { mounted, pos };
}

type Props = Omit<React.HTMLAttributes<HTMLDivElement>, "style" | keyof React.DOMAttributes<HTMLDivElement>> & {
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  place: (r: DOMRect) => PopPlace;
  /** off = bring your own border/fill/z-index */
  chrome?: boolean;
  /** a new key swaps the content with a fresh entrance */
  popKey?: string;
  ref?: React.RefObject<HTMLDivElement | null>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  children: React.ReactNode;
};

/** portal popup with the dropdown's slide entrance and (by default) its chrome */
export function AnchoredPopup({ anchor, open, onClose, place, chrome = true, popKey, ref, className, children, ...rest }: Props) {
  const own = useRef<HTMLDivElement>(null);
  const box = ref ?? own;
  const { mounted, pos } = useAnchoredPopup(anchor, open, onClose, place, box);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div
          key={popKey}
          ref={box}
          initial={{ opacity: 0, scaleY: 0.6, y: pos.up ? 8 : -8 }}
          animate={{ opacity: 1, scaleY: 1, y: 0 }}
          exit={{ opacity: 0, scaleY: 0.7, y: pos.up ? 6 : -6, transition: { duration: 0.15 } }}
          transition={{ duration: 0.28, ease: EASE }}
          className={cn("fixed", chrome && "z-[70] overflow-hidden border border-rose bg-coal shadow-[6px_6px_0_0_var(--rose-deep)]", className)}
          style={{
            left: pos.left,
            width: pos.width,
            ...(pos.up ? { bottom: window.innerHeight - pos.top, transformOrigin: "bottom" } : { top: pos.top, transformOrigin: "top" }),
          }}
          {...rest}
        >
          {chrome && <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-rose via-rose-hi to-transparent" aria-hidden />}
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
