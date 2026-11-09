"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

let clock: number | null = null;
const tickEverySecond = (cb: () => void) => {
  const tick = () => {
    clock = Date.now();
    cb();
  };
  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
};
const still = () => () => {};

function useNow(active: boolean) {
  const now = useSyncExternalStore(active ? tickEverySecond : still, () => clock, () => null);
  return active ? now : null;
}

/** the overlay's rolling-digit countdown, drawn at 1080p sizes; scale it with css `zoom` (keeps text crisp).
 *  four labels = days : hours : minutes : seconds, three = hours : minutes : seconds. `labelPx` lets a small zoom keep the labels readable.
 *  `at` = the server's now, used until the clock ticks; `onDone` fires once when it reaches zero */
export function FlipCountdown({ to, at, labels = ["Hours", "Minutes", "Seconds"], labelPx = 15, onDone }: { to: number; at: number; labels?: string[]; labelPx?: number; onDone?: () => void }) {
  const now = useNow(Number.isFinite(to));
  const diff = Math.ceil((to - Math.max(at, now ?? at)) / 1000);
  const left = Number.isFinite(diff) ? Math.max(0, diff) : 0;
  const hms = [Math.floor(left / 60) % 60, left % 60];
  const parts = labels.length === 4 ? [Math.floor(left / 86400), Math.floor(left / 3600) % 24, ...hms] : [Math.floor(left / 3600), ...hms];
  const reduce = useReducedMotion();
  const done = Number.isFinite(to) && now !== null && left === 0;
  const fire = useRef(onDone);
  useEffect(() => {
    fire.current = onDone;
  });
  useEffect(() => {
    if (done) fire.current?.();
  }, [done]);
  return (
    <div className="flex items-start gap-8" role="timer" aria-live="off">
      {parts.map((p, i) => (
        <div key={i} className="flex items-start gap-8">
          {i > 0 && <span className="num mt-[12px] text-[110px] leading-none text-ash/50" aria-hidden>:</span>}
          <div className="flex flex-col items-center gap-[76px]">
            <span className="num -my-[64px] flex h-[278px] items-center overflow-hidden text-[150px] leading-none tabular-nums text-paper [mask-image:linear-gradient(transparent,rgb(0_0_0/0.35)_32px,black_64px,black_calc(100%-64px),rgb(0_0_0/0.35)_calc(100%-32px),transparent)]">
              {String(p)
                .padStart(2, "0")
                .split("")
                .map((d, k) => (
                  <span key={k} className="relative inline-block">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={d}
                        className="block py-[64px]"
                        initial={reduce ? { opacity: 0 } : { transform: "translateY(-100%)", opacity: 0 }}
                        animate={reduce ? { opacity: 1 } : { transform: "translateY(0%)", opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { transform: "translateY(100%)", opacity: 0 }}
                        transition={{ duration: 0.72, ease: [0.65, 0, 0.35, 1] }}
                      >
                        {d}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                ))}
            </span>
            <span className="font-display font-bold text-ash" style={{ fontSize: labelPx }}>{labels[i]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
