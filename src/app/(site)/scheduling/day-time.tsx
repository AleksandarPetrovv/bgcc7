"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { UnderlineTabs } from "@/components/site/pool-pager";
import { useLang } from "@/components/site/lang";
import { cn } from "@/lib/utils";
import { offHours, PICK_STEP as STEP } from "@/lib/schedule";
import { localeOf } from "@/lib/i18n/locale";
import { dayDate, fmtDate } from "@/lib/time";

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);

/** each day between min and max ("YYYY-MM-DDTHH:mm", sofia) with its allowed minute range */
function daysOf(min: string, max: string) {
  const out: { date: string; lo: number; hi: number }[] = [];
  for (let d = dayDate(min); ; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    out.push({ date, lo: date === min.slice(0, 10) ? toMin(min.slice(11)) : 0, hi: date === max.slice(0, 10) ? toMin(max.slice(11)) : 24 * 60 - STEP });
    if (date >= max.slice(0, 10) || out.length > 7) return out;
  }
}

/** "Oct 1st, Sat" / "1 окт, сб" */
function dayName(date: string, lang: string) {
  const d = dayDate(date);
  const f = (o: Intl.DateTimeFormatOptions) => fmtDate(d, localeOf(lang), o, "UTC");
  const n = d.getUTCDate();
  if (lang === "bg") return `${n} ${f({ month: "short" }).replace(".", "")}, ${f({ weekday: "short" }).replace(".", "")}`;
  const th = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${f({ month: "short" })} ${n}${th}, ${f({ weekday: "short" })}`;
}

const at = (date: string, mins: number) => `${date}T${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
/** blocked holds "YYYY-MM-DDTHH" hours someone of the four can't play; the night (OFF_HOURS) is never free */
export const isFree = (blocked: Set<string>, v: string) => !blocked.has(v.slice(0, 13)) && !offHours(v);

/** first free time stepping from mins by step (never mins itself), null when none is left in range */
function seek(blocked: Set<string>, date: string, mins: number, step: number, lo: number, hi: number) {
  for (let x = mins + step; x >= lo && x <= hi; x += step) if (isFree(blocked, at(date, x))) return x;
  return null;
}

/** first free time of the window, or min when everything is blocked */
export function firstFree(min: string, max: string, blocked: Set<string>) {
  for (const d of daysOf(min, max)) {
    const x = isFree(blocked, at(d.date, d.lo)) ? d.lo : seek(blocked, d.date, d.lo, STEP, d.lo, d.hi);
    if (x != null) return at(d.date, x);
  }
  return min;
}

/** day tabs + arrow-only hour/minute picker limited to the scheduling window; arrows skip blocked hours. value is "YYYY-MM-DDTHH:mm" */
export function DayTime({ min, max, value, onChange, blocked }: { min: string; max: string; value: string; onChange: (v: string) => void; blocked: Set<string> }) {
  const lang = useLang();
  const days = daysOf(min, max);
  const di = Math.max(0, days.findIndex((d) => d.date === value.slice(0, 10)));
  const day = days[di];
  const t = toMin(value.slice(11, 16));
  const [dir, setDir] = useState(1);
  const go = (x: number | null) => {
    if (x == null) return;
    setDir(x >= t ? 1 : -1);
    onChange(at(day.date, x));
  };
  // a new day starts at its earliest free time
  const pickDay = (i: number) => {
    const d = days[i];
    const x = isFree(blocked, at(d.date, d.lo)) ? d.lo : (seek(blocked, d.date, d.lo, STEP, d.lo, d.hi) ?? d.lo);
    setDir(i >= di ? 1 : -1);
    onChange(at(d.date, x));
  };
  const step = (n: number) => seek(blocked, day.date, t, n, day.lo, day.hi);
  const [hUp, hDown, mUp, mDown] = [step(60), step(-60), step(STEP), step(-STEP)];
  const h = Math.floor(t / 60);
  const m = t % 60;
  return (
    <div className="grid justify-items-center gap-6">
      <UnderlineTabs names={days.map((d) => dayName(d.date, lang))} colors={days.map(() => "var(--rose)")} pos={di} onPick={pickDay} animate className="max-w-full justify-center" />
      <div className={cn("flex items-center gap-3 transition-opacity", !isFree(blocked, value) && "opacity-40")}>
        <Col label="hours" text={pad(h)} dir={dir} up={hUp == null ? null : () => go(hUp)} down={hDown == null ? null : () => go(hDown)} />
        <span className="num pb-1 text-5xl leading-none text-ash/50" aria-hidden>
          :
        </span>
        <Col label="minutes" text={pad(m)} dir={dir} up={mUp == null ? null : () => go(mUp)} down={mDown == null ? null : () => go(mDown)} />
      </div>
    </div>
  );
}

function Col({ label, text, dir, up, down }: { label: string; text: string; dir: number; up: (() => void) | null; down: (() => void) | null }) {
  const arrow = "grid h-8 w-14 place-items-center text-ash transition-colors hover:text-rose-hi disabled:opacity-25 disabled:hover:text-ash";
  return (
    <div className="flex flex-col items-center">
      <button type="button" aria-label={`${label} up`} disabled={!up} onClick={() => up?.()} className={arrow}>
        <ChevronUp className="size-5" />
      </button>
      <span className="pointer-events-none select-none text-5xl" aria-label={`${label} ${text}`}>
        <Reel text={text} dir={dir} />
      </span>
      <button type="button" aria-label={`${label} down`} disabled={!down} onClick={() => down?.()} className={arrow}>
        <ChevronDown className="size-5" />
      </button>
    </div>
  );
}

/** odometer like the overlay countdown: old and new digit slide one row together, soft fade at the edges */
function Reel({ text, dir }: { text: string; dir: number }) {
  const reduce = useReducedMotion();
  const v = {
    in: (d: number) => (reduce ? { opacity: 0 } : { transform: `translateY(${d > 0 ? 100 : -100}%)`, opacity: 0 }),
    on: { transform: "translateY(0%)", opacity: 1 },
    out: (d: number) => (reduce ? { opacity: 0 } : { transform: `translateY(${d > 0 ? -100 : 100}%)`, opacity: 0 }),
  };
  return (
    <span className="num -my-[0.43em] flex h-[1.86em] items-center overflow-hidden leading-none tabular-nums text-paper [mask-image:linear-gradient(transparent,rgb(0_0_0/0.35)_0.21em,black_0.43em,black_calc(100%-0.43em),rgb(0_0_0/0.35)_calc(100%-0.21em),transparent)]">
      {text.split("").map((c, k) => (
        <span key={k} className="relative inline-block">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.span key={c} custom={dir} variants={v} initial="in" animate="on" exit="out" transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }} className="block py-[0.43em]">
              {c}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
