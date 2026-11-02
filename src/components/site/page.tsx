"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Sparkle } from "./graphics";
import { DiscordLogo } from "./discord-logo";
import { useBelowFold } from "./motion";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";
import { SlantBg } from "./slant";
import { EASE } from "@/lib/ease";

export function SubNav({ items }: { items: { href: string; label: string; hidden?: boolean }[] }) {
  const path = usePathname();
  const t = useDict();
  return (
    <div className="sub-nav sticky top-16 z-30 border-b border-line bg-coal/95 backdrop-blur lg:top-20">
      <nav className="mx-auto flex max-w-page items-stretch gap-1 overflow-x-auto px-2 sm:gap-6 sm:px-4 lg:px-8 2xl:px-12" aria-label={t.nav.section}>
        {items.map((i) => {
          const active = path === i.href || (path.startsWith(`${i.href}/`) && !items.some((o) => o.href.length > i.href.length && (path === o.href || path.startsWith(`${o.href}/`))));
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 shrink-0 items-center px-2 text-[0.8rem] font-display font-bold transition-colors",
                active ? "text-paper" : "text-ash hover:text-paper",
                i.hidden && "opacity-40",
              )}
            >
              {i.label}
              {active && <motion.span layoutId="subnav-underline" className="absolute inset-x-2 bottom-0 h-0.5 bg-rose" transition={{ type: "spring", stiffness: 500, damping: 40 }} aria-hidden />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Blocks() {
    return (
      <span className="relative mb-[0.2em] inline-block h-[0.42em] w-[1.1em] self-end" aria-hidden>
        <span className="anim-mark-in absolute inset-0 translate-x-[0.09em] translate-y-[0.09em] -skew-x-12 bg-rose-deep" style={{ animationDelay: "0.3s" }} />
        <span className="anim-mark-in absolute inset-0 -skew-x-12 bg-rose" style={{ animationDelay: "0.22s" }} />
      </span>
    );
}

function Streaks() {
    return (
      <span className="mb-[0.22em] flex w-[1.4em] flex-col items-end gap-[0.07em] self-end" aria-hidden>
        {["w-full bg-paper", "w-3/4 bg-balkan", "w-1/2 bg-rose"].map((c, i) => (
          <span key={c} className={cn("anim-streak block h-[0.07em] origin-right -skew-x-[30deg]", c)} style={{ animationDelay: `${0.25 + i * 0.08}s` }} />
        ))}
      </span>
    );
}

function Dots() {
    return (
      <span className="mb-[0.24em] flex gap-[0.14em] self-end" aria-hidden>
        {["bg-paper", "bg-balkan", "bg-rose"].map((c, i) => (
          <span key={c} className={cn("anim-pop block size-[0.2em] rotate-45", c)} style={{ animationDelay: `${0.25 + i * 0.1}s` }} />
        ))}
      </span>
    );
}

function Glints() {
  return (
    <span className="relative mb-[0.08em] inline-block h-[0.85em] w-[1em] self-end text-paper" aria-hidden>
      <Sparkle className="left-0 top-[0.05em] size-[0.55em] text-rose-hi" enter={0.3} />
      <Sparkle className="bottom-0 right-0 size-[0.36em]" enter={0.45} delay={0.6} />
      <Sparkle className="right-[0.05em] top-0 size-[0.2em] text-balkan-hi" enter={0.58} delay={1.1} />
    </span>
  );
}

function Squiggle() {
  return (
    <svg viewBox="0 0 48 14" className="mb-[0.2em] h-[0.34em] w-[1.3em] self-end overflow-visible" aria-hidden>
      <path d="M2 10 L10 3 L18 10 L26 3 L34 10 L42 3" pathLength={1} className="anim-draw fill-none stroke-rose" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="46" cy="8" r="2" className="anim-appear fill-paper" style={{ animationDelay: "0.75s" }} />
    </svg>
  );
}

function Chevrons() {
  return (
    <span className="anim-rise mb-[0.18em] flex self-end" style={{ animationDelay: "0.25s" }} aria-hidden>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 10 16" className="anim-chevron -ml-[0.06em] h-[0.42em] w-[0.26em] fill-rose first:ml-0" style={{ animationDelay: `${i * 0.18}s` }}>
          <polygon points="0,0 4,0 10,8 4,16 0,16 6,8" />
        </svg>
      ))}
    </span>
  );
}

function Bubble() {
  return (
    <svg viewBox="0 0 26 26" className="mb-[0.1em] h-[0.66em] w-[0.66em] self-end overflow-visible" aria-hidden>
      <g className="mk-bubble">
        <path d="M3 1h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H11l-6 5v-5H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2Z" className="fill-rose" />
        <rect x="11.3" y="8.4" width="3.4" height="8" className="mk-stem fill-paper" />
      </g>
      <circle cx="13" cy="5" r="2" className="mk-dot fill-paper" />
    </svg>
  );
}

function Discord() {
  return (
    <span className="mb-[0.1em] block h-[0.62em] w-[0.62em] self-end" aria-hidden>
      <DiscordLogo className="mk-bubble block size-full overflow-visible text-rose" />
    </span>
  );
}

function Person({ className, delay }: { className: string; delay: number }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("mk-pop block", className)} style={{ animationDelay: `${delay}s` }}>
      <circle cx="12" cy="7" r="5" />
      <path d="M2 24c0-6 4.5-10 10-10s10 4 10 10Z" />
    </svg>
  );
}

function People() {
  return (
    <span className="mb-[0.2em] flex items-end gap-[0.08em] self-end" aria-hidden>
      <Person className="size-[0.34em] fill-paper" delay={0.25} />
      <Person className="size-[0.27em] fill-balkan" delay={0.35} />
      <Person className="size-[0.22em] fill-rose" delay={0.45} />
    </span>
  );
}

function Cards() {
  return (
    <span className="relative mb-[0.18em] inline-block h-[0.46em] w-[0.72em] self-end" aria-hidden>
      {[
        ["bg-paper", "-16deg"],
        ["bg-balkan", "0deg"],
        ["bg-rose", "16deg"],
      ].map(([c, r], i) => (
        <span
          key={c}
          className={cn("mk-fan absolute bottom-0 left-1/2 -ml-[0.13em] block h-[0.4em] w-[0.26em] origin-bottom border border-ink/60", c)}
          style={{ "--r": r, animationDelay: `${0.25 + i * 0.07}s` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

function Note({ className, delay, beamed }: { className: string; delay: number; beamed?: boolean }) {
  return (
    <span className="anim-bob block" style={{ animationDelay: `${delay + 0.6}s` }}>
      <svg viewBox="0 0 24 24" className={cn("mk-pop block overflow-visible", className)} style={{ animationDelay: `${delay}s` }}>
        {beamed ? (
          <>
            <ellipse cx="6" cy="19" rx="4" ry="3" transform="rotate(-20 6 19)" />
            <ellipse cx="18" cy="16.5" rx="4" ry="3" transform="rotate(-20 18 16.5)" />
            <rect x="8.6" y="4" width="2" height="15" />
            <rect x="20.6" y="1.5" width="2" height="15" />
            <path d="M8.6 4 22.6 1.5V5L8.6 7.5Z" />
          </>
        ) : (
          <>
            <ellipse cx="9" cy="19" rx="4.4" ry="3.2" transform="rotate(-20 9 19)" />
            <rect x="12" y="2" width="2.1" height="17" />
            <path d="M14.1 2c1 3 6 4.5 5 10-.6-3.2-2.6-4.6-5-5Z" />
          </>
        )}
      </svg>
    </span>
  );
}

export function Notes() {
  return (
    <span className="mb-[0.16em] flex items-end self-end" aria-hidden>
      <Note className="size-[0.4em] fill-paper" delay={0.25} beamed />
      <span className="-ml-[0.06em] mb-[0.12em]">
        <Note className="size-[0.28em] fill-balkan" delay={0.37} />
      </span>
      <span className="-ml-[0.09em]">
        <Note className="size-[0.24em] fill-rose" delay={0.49} />
      </span>
    </span>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" className="mb-[0.16em] h-[0.5em] w-[0.5em] self-end overflow-visible" aria-hidden>
      <rect x="1.5" y="1.5" width="21" height="21" className="mk-pop fill-none stroke-paper/50" strokeWidth={2.4} style={{ animationDelay: "0.2s" }} />
      <path d="M6 12.5 10.5 17 19.5 6.5" pathLength={1} className="anim-draw fill-none stroke-balkan" strokeWidth={3.6} strokeLinecap="square" style={{ animationDelay: "0.45s" }} />
    </svg>
  );
}

const ln = { fill: "none", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const delays = (...d: number[]) => ({ animationDelay: d.map((x) => `${x}s`).join(", ") });

function Bars() {
  return (
    <svg viewBox="0 0 24 24" className="mb-[0.16em] h-[0.5em] w-[0.5em] self-end overflow-visible" aria-hidden>
      {[
        [1, 13, "fill-paper/70", 0.25],
        [7, 5, "fill-balkan", 0.33],
        [13, 9.5, "fill-paper/70", 0.41],
        [19, 0, "fill-rose", 0.49],
      ].map(([x, y, c, d], i) => (
        <rect key={i} x={x as number} y={y as number} width={4.4} height={24 - (y as number)} className={cn("mk-bar", c as string)} style={delays(d as number, 2 + i * 0.9)} />
      ))}
    </svg>
  );
}

function Gear({ r, teeth, className, style }: { r: number; teeth: number; className: string; style?: React.CSSProperties }) {
  const c = 2 * Math.PI * r;
  return (
    <g className={className} style={style}>
      <circle r={r} fill="none" strokeWidth={r * 0.55} strokeDasharray={`${c / teeth / 2} ${c / teeth / 2}`} />
      <circle r={r * 0.78} fill="none" strokeWidth={r * 0.34} />
    </g>
  );
}

function Gears() {
  return (
    <svg viewBox="0 0 32 24" className="mb-[0.14em] h-[0.55em] w-[0.73em] self-end overflow-visible" aria-hidden>
      <g transform="translate(11 13)">
        <Gear r={8} teeth={8} className="mk-gear stroke-paper" style={{ animationDelay: "0.2s" }} />
      </g>
      <g transform="translate(24.5 6.5)">
        <Gear r={4.6} teeth={6} className="mk-gear mk-gear-r stroke-rose" style={{ animationDelay: "0.35s" }} />
      </g>
      <circle cx="25" cy="19" r="1.8" className="mk-pop fill-balkan" style={{ animationDelay: "0.55s" }} />
    </svg>
  );
}

function Me() {
  return (
    <svg viewBox="0 0 24 24" className="mb-[0.12em] h-[0.6em] w-[0.6em] self-end overflow-visible" aria-hidden>
      <circle cx="12" cy="7" r="4" pathLength={1} {...ln} className="mk-pen stroke-rose" transform="rotate(90 12 7)" />
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" pathLength={1} {...ln} className="mk-pen-late stroke-rose" />
    </svg>
  );
}

function Team() {
  const p = { ...ln, strokeWidth: 2 };
  return (
    <svg viewBox="0 0 24 24" className="mb-[0.12em] h-[0.62em] w-[0.62em] self-end overflow-visible" aria-hidden>
      <g className="mk-crowd stroke-rose" style={delays(0.4, 1.2)}>
        <circle cx={6} cy={4} r={2} {...p} />
        <path d="M5 10H4a2 2 0 00-2 2v1" {...p} />
      </g>
      <g className="mk-crowd stroke-balkan" style={delays(0.5, 1.45)}>
        <circle cx={18} cy={4} r={2} {...p} />
        <path d="M19 10h1a2 2 0 012 2v1" {...p} />
      </g>
      <g className="mk-crowd stroke-paper" style={delays(0.25, 1.7)}>
        <circle cx={12} cy={11} r={3} {...p} />
        <path d="M17 21v-1a2 2 0 00-2-2H9a2 2 0 00-2 2v1" {...p} />
      </g>
    </svg>
  );
}

function Users() {
  return (
    <svg viewBox="0 0 24 24" className="mb-[0.12em] h-[0.6em] w-[0.6em] self-end overflow-visible" aria-hidden>
      <g className="mk-crowd stroke-paper" style={delays(0.25, 1.3)}>
        <path d="M16 3.128a4 4 0 0 1 0 7.744" {...ln} />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" {...ln} />
      </g>
      <g className="mk-crowd stroke-rose" style={delays(0.4, 1.55)}>
        <circle cx="9" cy="7" r="4" {...ln} />
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...ln} />
      </g>
    </svg>
  );
}

function Swords() {
  return (
    <svg viewBox="0 0 24 24" className="mk-clash mb-[0.12em] h-[0.6em] w-[0.6em] self-end overflow-visible" aria-hidden>
      <g className="mk-swing-l stroke-rose">
        <path d="M14.5 17.5 3 6V3h3l11.5 11.5" {...ln} />
        <path d="m13 19 6-6M16 16l4 4M19 21l2-2" {...ln} />
      </g>
      <g className="mk-swing-r stroke-paper">
        <path d="M14.5 6.5 18 3h3v3l-3.5 3.5" {...ln} />
        <path d="m5 14 4 4M7.5 16.5 4 20M5 21l-2-2" {...ln} />
      </g>
      <path d="M12 6.2 12.9 9.1 15.8 10 12.9 10.9 12 13.8 11.1 10.9 8.2 10 11.1 9.1Z" className="mk-spark fill-balkan" />
    </svg>
  );
}

function Clock() {
  const hand = (d: string, cls: string) => (
    <span className={cn("absolute inset-0", cls)}>
      <svg viewBox="0 0 24 24" className="size-full overflow-visible">
        <path d={d} {...ln} className="stroke-paper" />
      </svg>
    </span>
  );
  return (
    <span className="relative mb-[0.12em] block h-[0.6em] w-[0.6em] self-end" aria-hidden>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible">
        <circle cx="12" cy="12" r="10" {...ln} strokeWidth={1.7} className="mk-pop stroke-rose" style={{ transformOrigin: "50% 50%", ...delays(0.2) }} />
      </svg>
      {hand("M12.7 12h3.1", "mk-hand-h")}
      {hand("M12 11.3V5.5", "mk-hand-m")}
    </span>
  );
}

const box = "mb-[0.12em] h-[0.6em] w-[0.6em] self-end overflow-visible";
const at = (d: number) => ({ animationDelay: `${d}s` });

function Stopwatch() {
  return (
    <span className="relative mb-[0.12em] block h-[0.6em] w-[0.6em] self-end" aria-hidden>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible">
        <circle cx="12" cy="14" r="8.5" {...ln} strokeWidth={1.9} className="mk-pop stroke-rose" style={{ transformOrigin: "50% 50%", ...at(0.2) }} />
        <path d="M10 2.5h4M12 2.5v3" {...ln} className="mk-pop stroke-paper" style={at(0.35)} />
        <path d="m19 6.5 1.5-1.5" {...ln} className="mk-pop stroke-balkan" style={at(0.45)} />
      </svg>
      <span className="mk-sweep absolute inset-0" style={{ transformOrigin: "50% 58.33%" }}>
        <svg viewBox="0 0 24 24" className="size-full overflow-visible">
          <path d="M12 13.3V8" {...ln} className="stroke-paper" />
        </svg>
      </span>
    </span>
  );
}

function Badge() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <g className="mk-hang">
        <g className="mk-sway" style={at(1.7)}>
          <path d="M7 1.5 12 9l5-7.5" pathLength={1} {...ln} className="mk-pen stroke-rose" style={at(0.1)} />
          <g className="mk-show" style={at(0.3)}>
            <rect x="5" y="9" width="14" height="13" rx="2" {...ln} className="stroke-paper" />
            <circle cx="12" cy="14" r="2" className="mk-dot fill-balkan" style={at(1.15)} />
            <path d="M9 18.5h6" pathLength={1} {...ln} className="mk-pen stroke-paper" style={at(1.3)} />
          </g>
        </g>
      </g>
    </svg>
  );
}

function Whistle() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <g className="mk-clash">
        <g className="mk-pop" style={at(0.2)}>
          <circle cx="8" cy="15" r="5" {...ln} className="stroke-paper" />
          <path d="M8 10h12.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5H13" {...ln} className="stroke-paper" />
          <circle cx="8" cy="15" r="1.6" className="fill-rose" />
        </g>
      </g>
      <path d="M14 6.5 15.5 3.5M18 7l2.5-2.5" {...ln} className="mk-toot stroke-balkan" />
    </svg>
  );
}

function Draft() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <g className="mk-pop" style={at(0.2)}>
        <rect x="1.5" y="5" width="9" height="14" rx="1.5" {...ln} className="stroke-balkan" transform="rotate(-8 6 12)" />
      </g>
      <g className="mk-pop" style={at(0.32)}>
        <rect x="13.5" y="5" width="9" height="14" rx="1.5" {...ln} className="stroke-paper" transform="rotate(8 18 12)" />
      </g>
      <path d="M3.8 12.6 5.6 14.4 8.6 10.6" pathLength={1} {...ln} className="mk-pen stroke-balkan" style={at(0.6)} />
      <path d="M14.5 17.5 21.5 6.5" pathLength={1} {...ln} className="mk-pen stroke-rose" style={at(0.75)} />
    </svg>
  );
}

function Camera() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <g className="mk-pop" style={at(0.2)}>
        <rect x="1.5" y="6.5" width="14" height="11" rx="2" {...ln} className="stroke-paper" />
        <path d="m15.5 10.5 6-3v9l-6-3Z" {...ln} className="stroke-paper" />
      </g>
      <circle cx="6" cy="10.5" r="1.7" className="mk-rec fill-rose" />
    </svg>
  );
}

function Layers() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <path d="m2 16.5 10 5 10-5" {...ln} className="mk-pop stroke-paper" style={{ ...at(0.2) }} />
      <g className="mk-drift" style={{ "--y": "1.2px" } as React.CSSProperties}>
        <path d="m2 12 10 5 10-5" {...ln} className="mk-pop stroke-balkan" style={at(0.3)} />
      </g>
      <g className="mk-drift" style={{ "--y": "-1.6px" } as React.CSSProperties}>
        <path d="M12 2.5 22 7.5 12 12.5 2 7.5Z" className="mk-pop fill-rose" style={at(0.42)} />
      </g>
    </svg>
  );
}

function Plan() {
  const tiles = [
    [1.5, 2, "fill-paper"], [9, 2, "fill-balkan"], [16.5, 2, "fill-rose"],
    [1.5, 9.5, "fill-rose"], [9, 9.5, "fill-paper"], [16.5, 9.5, "fill-balkan"],
  ] as const;
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      {tiles.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="6" height="6" rx="1.4" className={cn("mk-crowd", c)} style={delays(0.2 + i * 0.07, 1.5 + i * 0.4)} />
      ))}
      <path d="M1.5 20.5h21" pathLength={1} {...ln} className="mk-pen stroke-paper/50" style={at(0.7)} />
    </svg>
  );
}

function Timeline() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <path d="M3 12h18" pathLength={1} {...ln} className="mk-pen stroke-paper/50" style={at(0.2)} />
      <circle cx="3.5" cy="12" r="2.2" className="mk-pop fill-paper" style={at(0.3)} />
      <circle cx="12" cy="12" r="4.5" className="mk-ping fill-none stroke-rose" strokeWidth={1.4} />
      <circle cx="12" cy="12" r="3" className="mk-pop fill-rose" style={at(0.45)} />
      <circle cx="20.5" cy="12" r="2.2" {...ln} strokeWidth={1.8} className="mk-pop fill-ink stroke-balkan" style={at(0.6)} />
    </svg>
  );
}

function Screen() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <g className="mk-scan">
        <g className="mk-pop" style={at(0.2)}>
          <circle cx="10" cy="10" r="7" {...ln} className="stroke-paper" />
          <path d="m15.2 15.2 6 6" {...ln} strokeWidth={3} className="stroke-rose" />
        </g>
        <path d="M6.8 10.2 9 12.4 13 7.8" pathLength={1} {...ln} className="mk-pen stroke-balkan" style={at(0.55)} />
      </g>
    </svg>
  );
}

function Chain() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <g className="mk-drift" style={{ "--x": "0.8px", "--y": "-0.8px" } as React.CSSProperties}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" pathLength={1} {...ln} className="mk-pen stroke-rose" style={at(0.2)} />
      </g>
      <g className="mk-drift" style={{ "--x": "-0.8px", "--y": "0.8px" } as React.CSSProperties}>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" pathLength={1} {...ln} className="mk-pen stroke-paper" style={at(0.45)} />
      </g>
    </svg>
  );
}

function Log() {
  return (
    <svg viewBox="0 0 24 24" className={box} aria-hidden>
      <rect x="4" y="2" width="16" height="20" rx="2" {...ln} className="mk-pop stroke-paper" style={at(0.2)} />
      <path d="M8 7.5h8" pathLength={1} {...ln} className="mk-pen stroke-rose" style={at(0.45)} />
      <path d="M8 12h8" pathLength={1} {...ln} className="mk-pen stroke-balkan" style={at(0.65)} />
      <path d="M8 16.5h5" pathLength={1} {...ln} className="mk-pen stroke-paper" style={at(0.85)} />
    </svg>
  );
}

const MARKS = { gears: Gears, blocks: Blocks, streaks: Streaks, dots: Dots, glints: Glints, squiggle: Squiggle, chevrons: Chevrons, bubble: Bubble, discord: Discord, people: People, cards: Cards, notes: Notes, tick: Tick, bars: Bars, me: Me, team: Team, users: Users, swords: Swords, clock: Clock, stopwatch: Stopwatch, badge: Badge, whistle: Whistle, draft: Draft, camera: Camera, layers: Layers, plan: Plan, timeline: Timeline, screen: Screen, chain: Chain, log: Log };
export type Mark = keyof typeof MARKS;
const FALLBACK: Mark[] = ["blocks", "streaks", "dots", "glints", "squiggle", "chevrons", "bars"];

const markFor = (node: React.ReactNode): Mark => {
  const s = typeof node === "string" ? node : "";
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
};

export function PageTitle({
  children,
  accent,
  right,
  className,
  mark,
}: {
  children: React.ReactNode;
  mark?: Mark;
  accent?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  const M = MARKS[mark ?? markFor(children)];
  // the word joiner keeps the mark on the same line as the last word
  const mk = (
    <>
      {"⁠"}
      <span className="ml-[0.4em] inline-flex items-end align-bottom">
        <M />
      </span>
    </>
  );
  return (
    <div className={cn("no-enter relative mb-6 flex flex-wrap items-end gap-x-8 gap-y-3 pb-3 sm:mb-8 sm:gap-y-4", className)}>
      <h1 className="heading-slam min-w-0 max-w-full break-words text-[clamp(2rem,8.5vw,3rem)] sm:text-6xl">
        <span className="anim-letter">
          {children}
          {!accent && mk}
        </span>
        {accent && (
          <>
            {" "}
            <span className="anim-letter text-rose-hi" style={{ animationDelay: "0.12s" }}>
              / {accent}
              {mk}
            </span>
          </>
        )}
      </h1>
      {right && (
        <div className="anim-rise ml-auto flex flex-wrap items-center gap-3" style={{ animationDelay: "0.15s" }}>
          {right}
        </div>
      )}
      <span className="anim-grow-x absolute inset-x-0 bottom-0 h-px bg-line" aria-hidden />
    </div>
  );
}

export function Container({ children, className, plain }: { children: React.ReactNode; className?: string; plain?: boolean }) {
  return <div className={cn(!plain && "enter-kids", "mx-auto w-full max-w-page px-4 pt-6 sm:px-6 sm:pt-10 lg:px-10 2xl:px-14", className)}>{children}</div>;
}

export function SectionHeading({ children, mark = "glints" }: { children: React.ReactNode; mark?: Mark }) {
  const M = MARKS[mark];
  const [ref, below] = useBelowFold<HTMLHeadingElement>();
  const cls = "heading-slam mb-5 mt-14 flex items-center gap-3 text-[clamp(1.6rem,7.5vw,2.25rem)] first:mt-0";
  if (below)
    return (
      <h2 ref={ref} className={cls}>
        <span>
          <M />
        </span>
        <span className="min-w-0 break-words">{children}</span>
        <span className="h-px flex-1 border-t-2 border-dashed border-line" aria-hidden />
        <span className="size-2 shrink-0 rotate-45 bg-rose" aria-hidden />
      </h2>
    );
  return (
    <motion.h2
      ref={ref}
      className={cls}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: "some" }}
    >
      <motion.span variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }} transition={{ duration: 0.5, ease: EASE }}>
        <M />
      </motion.span>
      <motion.span className="min-w-0 break-words" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, delay: 0.05, ease: EASE }}>
        {children}
      </motion.span>
      <motion.span
        className="h-px flex-1 origin-left border-t-2 border-dashed border-line"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
        transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
        aria-hidden
      />
      <motion.span
        className="size-2 shrink-0 rotate-45 bg-rose"
        variants={{ hidden: { opacity: 0, scale: 0 }, show: { opacity: 1, scale: 1 } }}
        transition={{ duration: 0.4, delay: 0.8, ease: EASE }}
        aria-hidden
      />
    </motion.h2>
  );
}

export function SubHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 flex items-center gap-2.5 text-sm font-display font-bold text-paper", className)}>
      {children}
      <span className="h-px flex-1 border-t border-dashed border-line" aria-hidden />
    </h2>
  );
}

export function Tag({ children, tone = "rose", className }: { children: React.ReactNode; tone?: "rose" | "balkan" | "ink" | "paper"; className?: string }) {
  const t = {
    rose: "bg-rose text-white",
    balkan: "bg-balkan text-on-fill",
    ink: "bg-ink text-paper",
    paper: "bg-paper text-ink",
  }[tone];
  return <span className={cn("inline-block px-1.5 py-0.5 text-[0.6rem] font-display font-bold leading-none", t, className)}>{children}</span>;
}

export function SlantButton({
  children,
  tone = "rose",
  className,
  href,
  onClick,
  type = "button",
  download,
  disabled,
  fill,
}: {
  children: React.ReactNode;
  tone?: "rose" | "balkan" | "paper" | "outline";
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  download?: boolean;
  disabled?: boolean;
  fill?: string;
}) {
  // [text, skewed background]: skew on an absolute span so the text is never transformed (blurry otherwise)
  const [text, bg] = {
    rose: ["text-white", "bg-rose group-hover/sk:bg-rose-hi"],
    balkan: ["text-on-fill hover:text-ink", "bg-balkan group-hover/sk:bg-paper"],
    paper: ["text-ink", "bg-paper group-hover/sk:bg-rose-deep"],
    outline: ["text-paper", "border border-line group-hover/sk:border-rose"],
  }[tone];
  const cls = cn("group/sk relative isolate inline-flex items-center gap-2 px-4 py-2 text-sm font-display font-bold", text, className);
  const inner = (
    <>
      <SlantBg className={cn(bg, fill)} />
      {children}
    </>
  );
  if (href && download)
    return (
      <a href={href} download className={cls}>
        {inner}
      </a>
    );
  if (href?.startsWith("http"))
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(cls, "disabled:pointer-events-none disabled:opacity-60")}>
      {inner}
    </button>
  );
}
