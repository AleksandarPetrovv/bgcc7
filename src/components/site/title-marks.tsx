"use client";

import { Sparkle } from "./graphics";
import { DiscordLogo } from "./discord-logo";
import { cn } from "@/lib/utils";

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

export const MARKS = { gears: Gears, glints: Glints, squiggle: Squiggle, chevrons: Chevrons, bubble: Bubble, discord: Discord, notes: Notes, tick: Tick, bars: Bars, me: Me, team: Team, users: Users, swords: Swords, clock: Clock, stopwatch: Stopwatch, badge: Badge, whistle: Whistle, draft: Draft, camera: Camera, layers: Layers, plan: Plan, timeline: Timeline, screen: Screen, chain: Chain, log: Log };
export type Mark = keyof typeof MARKS;
