"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useDict } from "./lang";
import { EASE } from "@/lib/ease";

// now floored to the tick so the snapshot stays stable between ticks
const ticker = (tick: number) => ({
  subscribe: (cb: () => void) => {
    const id = setInterval(cb, tick);
    return () => clearInterval(id);
  },
  get: () => Math.floor(Date.now() / tick) * tick,
});
const slow = ticker(30_000);
const fast = ticker(500);
const getServerNow = () => null;

const pad = (n: number) => String(n).padStart(2, "0");

function Roll({ value }: { value: string }) {
  if (value === "--") return <span className="inline-block">{value}</span>;
  return (
    <span className="relative inline-flex overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-70%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Countdown({ to, from, className }: { to: string; from?: string; className?: string }) {
  const t = useDict();
  const now = useSyncExternalStore(slow.subscribe, slow.get, getServerNow);
  const left = now === null ? 0 : Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor(left / 3_600_000) % 24;
  const m = Math.floor(left / 60_000) % 60;

  const start = from ? new Date(from).getTime() : null;
  const end = new Date(to).getTime();
  const pct = now === null || start === null || end <= start ? null : Math.min(1, Math.max(0, (now - start) / (end - start)));
  return (
    <>
    <time dateTime={to} className={cn("num mt-1 flex w-fit items-start gap-x-4 whitespace-nowrap text-5xl text-paper", d >= 100 && "max-sm:text-4xl", className)}>
      {[d, h, m].map((n, i) => (
        <span key={i} className="flex items-start gap-x-4">
          {i > 0 && <span className="mt-[0.2em] h-[0.7em] w-0.5 skew-x-[-14deg] bg-rose/60" aria-hidden />}
          <span className="flex flex-col items-center">
            <Roll value={now === null ? "--" : i ? pad(n) : String(n)} />
            <span className="mt-1 font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ash">{t.common.units[i]}</span>
          </span>
        </span>
      ))}
    </time>
    {pct !== null && (
      <span className="absolute inset-x-0 bottom-0 block h-1 bg-slate" aria-hidden>
        <motion.span
          className="block h-full origin-left bg-gradient-to-r from-rose-deep to-rose"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={{ duration: 1.4, ease: EASE }}
        />
      </span>
    )}
    </>
  );
}

// m:ss draft clock in the nav; offset = server time minus local time
export function MatchClock({ end, offset, pause }: { end: number; offset: number; pause: boolean }) {
  const now = useSyncExternalStore(fast.subscribe, fast.get, getServerNow);
  if (now === null) return null;
  const s = Math.ceil(Math.max(0, end - (now + offset)) / 1000);
  const low = !pause && s <= 10;
  return (
    <span className={cn("num ml-0.5 tabular-nums", pause ? "text-white/70" : low ? "text-white" : "text-white/85")}>
      {Math.floor(s / 60)}:{pad(s % 60)}
    </span>
  );
}
