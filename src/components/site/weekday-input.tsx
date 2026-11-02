"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useDict, useLang } from "./lang";
import { dayFmt, dayMonth } from "@/lib/time";
import { FORMAT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/ease";
import { SlantBg } from "@/components/site/slant";
import { AnchoredPopup } from "@/components/site/anchored-popup";

type Props = {
  value: string;
  onValue: (v: string) => void;
  kind?: "datetime-local" | "date";
  name?: string;
  required?: boolean;
  "aria-label"?: string;
  className?: string;
  /** skewed background layer (border, fill; hover/focus via group-hover/dt, group-focus-within/dt) */
  box: string;
  /** text style of the shown value */
  text: string;
};

const YEAR = FORMAT.year;
const YEARS = [YEAR - 1, YEAR];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const monthDays = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** date / datetime-local field that reads "10 Nov, Tuesday, 11:11" (", 2026" when outside the tournament year; the weekday shortens only if it doesn't fit).
 *  the date opens a one-click calendar (stays in the set year), the time a wheel picker, the year a list of the tournament year and the one before; the weekday does nothing.
 *  once the real date is in the tournament year the year is hidden, so new admins can't pick the wrong one. */
export function WeekdayInput({ value, onValue, kind = "datetime-local", name, required, "aria-label": aria, className, box, text }: Props) {
  const t = useDict();
  const lang = useLang();
  const [open, setOpen] = useState<null | "cal" | "time" | "year">(null);
  const [short, setShort] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const timeSeg = useRef<HTMLButtonElement>(null);
  const yearSeg = useRef<HTMLButtonElement>(null);

  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  const [y, mo, d] = m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
  const [hh, mi] = m?.[4] ? [+m[4], +m[5]] : [18, 0];
  const timed = kind === "datetime-local";
  const locked = new Date().getFullYear() === YEAR;
  const showYear = !!m && y !== YEAR;
  const week = (w: "long" | "short") => (m ? dayFmt(value, lang, { weekday: w }) : "");
  const full = m ? [dayMonth(value, lang), week("long"), timed && `${pad(hh)}:${pad(mi)}`, showYear && y].filter(Boolean).join(", ") : "—";

  useLayoutEffect(() => {
    const fit = () => row.current && probe.current && setShort(probe.current.offsetWidth > row.current.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    if (row.current) ro.observe(row.current);
    return () => ro.disconnect();
  }, [full, text]);

  const set = (ny: number, nm: number, nd: number, h = hh, n = mi) => onValue(iso(ny, nm, Math.min(nd, monthDays(ny, nm))) + (timed ? `T${pad(h)}:${pad(n)}` : ""));
  const calYear = m ? y : locked ? YEAR : new Date().getFullYear();
  const toggle = (k: typeof open) => setOpen((o) => (o === k ? null : k));
  const seg = (on: boolean) =>
    cn("-mx-1 px-1 outline-none transition-colors duration-150 hover:bg-rose/20 hover:text-paper focus-visible:bg-rose/25", on && "bg-rose/30 text-paper");

  return (
    <div ref={field} role="group" data-field aria-label={aria} className={cn("group/dt relative isolate flex min-w-0 items-center pl-4 pr-3", className)}>
      {/* first in the field on purpose: a wrapping <label> forwards hover and clicks to its first control, which must not be the date button */}
      <input
        tabIndex={-1}
        aria-hidden
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        onInvalid={() => setOpen("cal")}
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
        style={{ opacity: 0, height: 1, minHeight: 0, padding: 0, border: 0 }}
      />
      <SlantBg className={cn(box, open && "!border-b-rose !bg-well shadow-[4px_4px_0_0_var(--rose-deep)]")} />
      <span aria-hidden ref={probe} className={cn("pointer-events-none invisible absolute left-0 top-0 whitespace-pre", text)}>
        {full}
      </span>
      <span ref={row} className={cn("flex min-w-0 flex-1 items-center overflow-hidden whitespace-pre", text)}>
        {m ? (
          <>
            <button type="button" onClick={() => toggle("cal")} className={seg(open === "cal")}>
              {dayMonth(value, lang)}
            </button>
            <span className="pointer-events-none">, {week(short ? "short" : "long")}</span>
            {timed && (
              <>
                <span className="pointer-events-none">, </span>
                <button ref={timeSeg} type="button" onClick={() => toggle("time")} className={seg(open === "time")}>
                  {pad(hh)}:{pad(mi)}
                </button>
              </>
            )}
            {showYear && (
              <>
                <span className="pointer-events-none">, </span>
                <button ref={yearSeg} type="button" onClick={() => toggle("year")} className={seg(open === "year")}>
                  {y}
                </button>
              </>
            )}
          </>
        ) : (
          <button type="button" onClick={() => toggle("cal")} className={cn(seg(open === "cal"), "text-ash")}>
            —
          </button>
        )}
      </span>
      <button type="button" aria-label={aria} onClick={() => toggle("cal")} className="ml-auto shrink-0 pl-2 text-ash outline-none transition-colors hover:text-paper focus-visible:text-rose-hi">
        <CalendarDays className="size-4" />
      </button>

      <Pop anchor={field} open={open === "cal"} onClose={() => setOpen(null)} width={21}>
        <Calendar
          year={calYear}
          start={m ? mo : calYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 1}
          picked={m ? iso(y, mo, d) : ""}
          lang={lang}
          labels={{ prev: t.common.prevMonth, next: t.common.nextMonth }}
          onPick={(nm, nd) => {
            set(calYear, nm, nd);
            setOpen(null);
          }}
        />
      </Pop>
      <Pop anchor={timeSeg} open={open === "time"} onClose={() => setOpen(null)} width={10}>
        <TimeWheel h={hh} mi={mi} onHour={(h) => set(y, mo, d, h, mi)} onMinute={(n) => set(y, mo, d, hh, n)} />
      </Pop>
      <Pop anchor={yearSeg} open={open === "year"} onClose={() => setOpen(null)} width={8}>
        <div className="p-1">
          {YEARS.map((n, i) => (
            <motion.button
              key={n}
              type="button"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE, delay: i * 0.03 } }}
              onClick={() => {
                set(n, mo, d);
                setOpen(null);
              }}
              className={cn(
                "relative flex min-h-9 w-full items-center gap-2 px-3 text-left font-display text-sm font-bold transition-colors",
                n === y ? "bg-rose/80 text-white" : "text-paper/75 hover:bg-rose/12 hover:text-paper",
              )}
            >
              <span className="num flex-1">{n}</span>
              {n === y && <Check className="size-3.5" strokeWidth={3} />}
            </motion.button>
          ))}
        </div>
      </Pop>
    </div>
  );
}

/** popup under its anchor (always below), width in rem so it scales with the site */
function Pop({ anchor, open, onClose, width, children }: { anchor: React.RefObject<HTMLElement | null>; open: boolean; onClose: () => void; width: number; children: React.ReactNode }) {
  const place = (r: DOMRect) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const w = Math.min(width * rem, window.innerWidth - 16);
    return { left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: r.bottom + 6, width: w };
  };
  return (
    <AnchoredPopup anchor={anchor} open={open} onClose={onClose} place={place}>
      {children}
    </AnchoredPopup>
  );
}

/** one month at a time, monday first, never leaves `year`; a click picks the day */
function Calendar({
  year,
  start,
  picked,
  lang,
  labels,
  onPick,
}: {
  year: number;
  start: number;
  picked: string;
  lang: string;
  labels: { prev: string; next: string };
  onPick: (month: number, day: number) => void;
}) {
  const [month, setMonth] = useState(start);
  const [dir, setDir] = useState(0);
  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = monthDays(year, month);
  const title = dayFmt(iso(year, month, 1), lang, { month: "long" });
  // 2024-01-01 was a monday
  const heads = Array.from({ length: 7 }, (_, i) => dayFmt(iso(2024, 1, 1 + i), lang, { weekday: "narrow" }));
  const step = (n: number) => {
    setDir(n);
    setMonth((x) => x + n);
  };
  const arrow = "grid size-9 place-items-center text-ash outline-none transition-colors hover:bg-rose/15 hover:text-paper focus-visible:text-rose-hi disabled:pointer-events-none disabled:opacity-25";
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-1">
        <button type="button" aria-label={labels.prev} disabled={month === 1} onClick={() => step(-1)} className={arrow}>
          <ChevronLeft className="size-4" />
        </button>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={month}
            initial={{ opacity: 0, x: dir * 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -14 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex-1 whitespace-nowrap text-center font-display text-base font-bold capitalize text-paper"
          >
            {title} <span className="num text-ash">{year}</span>
          </motion.span>
        </AnimatePresence>
        <button type="button" aria-label={labels.next} disabled={month === 12} onClick={() => step(1)} className={arrow}>
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {heads.map((h, i) => (
          <span key={i} className={cn("pb-1 font-display text-xs font-bold uppercase", i > 4 ? "text-rose-hi/80" : "text-ash")}>
            {h}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`l${i}`} aria-hidden />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const id = iso(year, month, day);
          const on = id === picked;
          return (
            <motion.button
              key={`${month}-${day}`}
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE, delay: Math.min(lead + i, 30) * 0.006 } }}
              onClick={() => onPick(month, day)}
              className={cn(
                "group/d relative isolate grid h-9 place-items-center font-display text-sm font-bold tabular-nums outline-none transition-colors",
                on ? "text-white" : "text-paper/80 hover:text-paper focus-visible:text-paper",
              )}
            >
              <SlantBg
                className={cn(
                  "inset-0.5 transition-colors",
                  on ? "bg-rose" : "group-hover/d:bg-rose/20 group-focus-visible/d:bg-rose/20",
                  !on && id === today && "border border-rose/60",
                )}
              />
              {day}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

const ROWS = 5;
// one mouse notch is ~100, trackpad events are a few each: 30 lets one notch step a row without trackpads racing
const WHEEL_STEP = 30;
// wait for smooth scroll and snap to finish before committing, so passing rows don't each fire onPick
const SETTLE_MS = 120;

/** apple-style wheels: scroll either column, the centre row is the value; rows further out shrink and fade (sizes, not transforms, so text stays crisp) */
function TimeWheel({ h, mi, onHour, onMinute }: { h: number; mi: number; onHour: (h: number) => void; onMinute: (m: number) => void }) {
  return (
    <div className="relative flex h-[12.5rem] items-stretch">
      <span className="pointer-events-none absolute inset-x-2 top-1/2 h-10 -translate-y-1/2 border-y border-rose/40 bg-rose/12" aria-hidden />
      <Wheel items={Array.from({ length: 24 }, (_, i) => i)} cur={h} onPick={onHour} />
      <span className="relative grid shrink-0 place-items-center px-1 font-display text-xl font-black text-paper" aria-hidden>
        :
      </span>
      <Wheel items={Array.from({ length: 60 }, (_, i) => i)} cur={mi} onPick={onMinute} />
    </div>
  );
}

function Wheel({ items, cur, onPick }: { items: number[]; cur: number; onPick: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [first] = useState(() => Math.max(0, items.indexOf(cur)));
  const [at, setAt] = useState(first);
  const settle = useRef(0);
  const rowH = () => (ref.current ? ref.current.clientHeight / ROWS : 1);
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = first * rowH();
  }, [first]);
  useEffect(() => () => clearTimeout(settle.current), []);
  // a mouse notch scrolls ~3 rows natively; step exactly one row per notch (trackpads add up their small deltas first)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0;
    let goal = -1;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < WHEEL_STEP) return;
      const from = goal >= 0 ? goal : Math.round(el.scrollTop / rowH());
      goal = Math.max(0, Math.min(items.length - 1, from + Math.sign(acc)));
      acc = 0;
      el.scrollTo({ top: goal * rowH(), behavior: "smooth" });
    };
    const end = () => (goal = -1);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("scrollend", end);
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("scrollend", end);
    };
  }, [items.length]);
  const scroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / rowH())));
    setAt(i);
    clearTimeout(settle.current);
    settle.current = window.setTimeout(() => onPick(items[i]), SETTLE_MS);
  };
  const spacer = <div style={{ height: `${((ROWS - 1) / 2) * 2.5}rem` }} aria-hidden />;
  return (
    <div ref={ref} onScroll={scroll} className="relative flex-1 basis-0 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {spacer}
      {items.map((n, i) => {
        const dist = Math.abs(i - at);
        return (
          <button
            key={n}
            type="button"
            onClick={() => ref.current?.scrollTo({ top: i * rowH(), behavior: "smooth" })}
            className={cn(
              "flex h-10 w-full snap-center snap-always items-center justify-center font-display font-bold tabular-nums outline-none transition-[color,font-size,opacity] duration-150",
              dist === 0 ? "text-xl text-paper" : dist === 1 ? "text-base text-paper/55" : "text-sm text-paper/20",
            )}
          >
            {pad(n)}
          </button>
        );
      })}
      {spacer}
    </div>
  );
}
