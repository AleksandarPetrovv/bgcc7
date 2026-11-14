"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Film } from "lucide-react";
import { EASE } from "@/lib/ease";
import { SlantBg } from "./slant";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const SWAP = { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 16 }, transition: { duration: 0.35, ease: EASE } } as const;
const STEP_MS = 5000;

/** the demos' seek bar, top right: where the demo is, how long it runs and what's left; drag or click the track to jump, folds away to a small button */
export function DemoBar({ t, len, onSeek }: { t: number; len: number; onSeek: (ms: number) => void }) {
  const [open, setOpen] = useState(true);
  const [drag, setDrag] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const at = (x: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.round(Math.min(1, Math.max(0, (x - r.left) / r.width)) * len);
  };
  const shown = Math.min(len, drag ?? t);
  const p = len ? (shown / len) * 100 : 0;

  return (
    <div className="fixed right-4 top-4 z-[90] flex justify-end text-paper">
      <AnimatePresence mode="popLayout">
        {open ? (
          <motion.div key="bar" {...SWAP} className="relative isolate flex h-12 w-[min(460px,calc(100vw-32px))] items-center gap-3 pl-2 pr-5">
            <SlantBg className="border border-line bg-ink/90 shadow-lg backdrop-blur-sm" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Hide Demo Bar" className="grid size-8 shrink-0 place-items-center text-ash transition-colors hover:text-paper">
              <ChevronRight className="size-5" />
            </button>
            <span className="num shrink-0 text-[15px] font-bold tabular-nums">
              {mmss(shown)}
              <span className="text-ash"> / {mmss(len)}</span>
            </span>
            <div
              ref={track}
              role="slider"
              tabIndex={0}
              aria-label="Demo Position"
              aria-valuemin={0}
              aria-valuemax={Math.round(len / 1000)}
              aria-valuenow={Math.round(shown / 1000)}
              aria-valuetext={`${mmss(shown)} of ${mmss(len)}`}
              className="group relative h-8 min-w-0 flex-1 cursor-pointer touch-none outline-none"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag(at(e.clientX));
              }}
              onPointerMove={(e) => drag != null && setDrag(at(e.clientX))}
              onPointerUp={(e) => {
                if (drag == null) return;
                onSeek(at(e.clientX));
                setDrag(null);
              }}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(e) => {
                const d = e.key === "ArrowRight" ? STEP_MS : e.key === "ArrowLeft" ? -STEP_MS : 0;
                if (!d) return;
                e.preventDefault();
                onSeek(Math.min(len, Math.max(0, t + d)));
              }}
            >
              <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-line" />
              <span className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-rose" style={{ width: `${p}%` }} />
              <span
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-rose ring-2 ring-ink transition-transform duration-200 group-hover:scale-125 group-focus-visible:scale-125"
                style={{ left: `${p}%` }}
              />
            </div>
            <span className="num shrink-0 text-[15px] font-bold tabular-nums text-ash">−{mmss(len - shown)}</span>
          </motion.div>
        ) : (
          <motion.button key="tab" type="button" {...SWAP} onClick={() => setOpen(true)} aria-label="Show Demo Bar" className="relative isolate grid h-12 w-14 place-items-center text-ash transition-colors hover:text-paper">
            <SlantBg className="border border-line bg-ink/90 shadow-lg backdrop-blur-sm" />
            <Film className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
