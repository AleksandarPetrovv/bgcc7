"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";

const TICK = 30_000;
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, TICK);
  return () => clearInterval(id);
};
const getNow = () => Math.floor(Date.now() / TICK) * TICK;
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

export function Countdown({ to, from }: { to: string; from?: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const left = now === null ? 0 : Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor(left / 3_600_000) % 24;
  const m = Math.floor(left / 60_000) % 60;

  const start = from ? new Date(from).getTime() : null;
  const end = new Date(to).getTime();
  const pct = now === null || start === null || end <= start ? null : Math.min(1, Math.max(0, (now - start) / (end - start)));
  return (
    <>
    <time dateTime={to} className="num mt-1 block text-5xl text-paper">
      <Roll value={now === null ? "--" : String(d)} />
      <span className="text-2xl text-ash">d</span> <Roll value={now === null ? "--" : pad(h)} />
      <span className="text-2xl text-ash">h</span> <Roll value={now === null ? "--" : pad(m)} />
      <span className="text-2xl text-ash">m</span>
    </time>
    {pct !== null && (
      <span className="absolute inset-x-0 bottom-0 block h-1 bg-slate" aria-hidden>
        <motion.span
          className="block h-full origin-left bg-gradient-to-r from-rose-deep to-rose"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </span>
    )}
    </>
  );
}
