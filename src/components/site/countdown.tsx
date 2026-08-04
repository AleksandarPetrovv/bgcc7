"use client";

import { useSyncExternalStore } from "react";

const TICK = 30_000;
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, TICK);
  return () => clearInterval(id);
};
const getNow = () => Math.floor(Date.now() / TICK) * TICK;
const getServerNow = () => null;

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ to }: { to: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const left = now === null ? 0 : Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor(left / 3_600_000) % 24;
  const m = Math.floor(left / 60_000) % 60;

  return (
    <time dateTime={to} className="num mt-1 block text-5xl text-paper">
      {now === null ? "--" : d}
      <span className="text-2xl text-ash">d</span> {now === null ? "--" : pad(h)}
      <span className="text-2xl text-ash">h</span> {now === null ? "--" : pad(m)}
      <span className="text-2xl text-ash">m</span>
    </time>
  );
}
