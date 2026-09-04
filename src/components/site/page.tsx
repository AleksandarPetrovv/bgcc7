"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Sparkle, TriTick } from "./graphics";
import { Tabs } from "./tabs";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";

export function SubNav({ items }: { items: { href: string; label: string; hidden?: boolean }[] }) {
  const path = usePathname();
  const t = useDict();
  return (
    <div className="sticky top-16 z-30 border-b border-line bg-coal/95 backdrop-blur lg:top-20">
      <nav className="mx-auto flex max-w-6xl items-stretch gap-1 overflow-x-auto px-2 sm:gap-6 sm:px-4" aria-label={t.nav.section}>
        {items.map((i) => {
          const active = path === i.href || (path.startsWith(`${i.href}/`) && !items.some((o) => o.href.length > i.href.length && (path === o.href || path.startsWith(`${o.href}/`))));
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 shrink-0 items-center px-2 text-[0.8rem] font-black uppercase tracking-wide transition-colors",
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
      <Sparkle className="right-[0.05em] top-0 size-[0.2em] text-balkan" enter={0.58} delay={1.1} />
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

function Notes() {
  return (
    <span className="mb-[0.16em] flex items-end gap-[0.04em] self-end" aria-hidden>
      <Note className="size-[0.4em] fill-paper" delay={0.25} beamed />
      <span className="mb-[0.18em]">
        <Note className="size-[0.3em] fill-balkan" delay={0.37} />
      </span>
      <Note className="size-[0.26em] fill-rose" delay={0.49} />
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

function Bars() {
  return (
    <span className="mb-[0.2em] flex h-[0.5em] items-end gap-[0.06em] self-end" aria-hidden>
      {[
        ["h-[45%] bg-paper/70", 0.25],
        ["h-[80%] bg-balkan", 0.33],
        ["h-[60%] bg-paper/70", 0.41],
        ["h-full bg-rose", 0.49],
      ].map(([c, d]) => (
        <span key={c as string} className={cn("mk-rise block w-[0.1em] origin-bottom", c as string)} style={{ animationDelay: `${d}s` }} />
      ))}
    </span>
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

const MARKS = { gears: Gears, blocks: Blocks, streaks: Streaks, dots: Dots, glints: Glints, squiggle: Squiggle, chevrons: Chevrons, bubble: Bubble, people: People, cards: Cards, notes: Notes, tick: Tick, bars: Bars };
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
  return (
    <div className={cn("no-enter relative mb-6 flex flex-wrap items-end gap-x-8 gap-y-3 pb-3 sm:mb-8 sm:gap-y-4", className)}>
      <h1 className="heading-slam flex min-w-0 max-w-full flex-wrap items-end gap-x-[0.3em] break-words text-[clamp(2rem,8.5vw,3rem)] sm:text-6xl">
        <span className="anim-letter">{children}</span>
        {accent && (
          <span className="anim-letter text-rose-hi" style={{ animationDelay: "0.12s" }}>
            / {accent}
          </span>
        )}
        <M />
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
  return <div className={cn(!plain && "enter-kids", "mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10", className)}>{children}</div>;
}

export function Wide({ children, className, full }: { children: React.ReactNode; className?: string; full?: boolean }) {
  return (
    <div className={cn(full ? "ml-[calc(50%-min(960px,50vw-2rem))] w-[min(1920px,calc(100vw-4rem))]" : "ml-[calc(50%-min(750px,50vw-1.5rem))] w-[min(1500px,calc(100vw-3rem))]", className)}>
      {children}
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      className="heading-slam mb-5 mt-14 flex items-center gap-3 text-[clamp(1.6rem,7.5vw,2.25rem)] first:mt-0"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: "some" }}
    >
      <motion.span variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <TriTick />
      </motion.span>
      <motion.span className="min-w-0 break-words" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </motion.span>
      <motion.span
        className="h-px flex-1 origin-left border-t border-dashed border-line"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
        transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden
      />
    </motion.h2>
  );
}

export function SubHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 flex items-center gap-2.5 text-sm font-black uppercase tracking-wide text-paper", className)}>
      {children}
      <span className="h-px flex-1 border-t border-dashed border-line" aria-hidden />
    </h2>
  );
}

export function Tag({ children, tone = "rose", className }: { children: React.ReactNode; tone?: "rose" | "balkan" | "ink" | "paper"; className?: string }) {
  const t = {
    rose: "bg-rose text-white",
    balkan: "bg-balkan text-ink",
    ink: "bg-ink text-paper",
    paper: "bg-paper text-ink",
  }[tone];
  return <span className={cn("inline-block px-1.5 py-0.5 text-[0.6rem] font-black uppercase leading-none tracking-wide", t, className)}>{children}</span>;
}

export function SlantButton({
  children,
  tone = "rose",
  className,
  href,
  onClick,
  type = "button",
  download,
}: {
  children: React.ReactNode;
  tone?: "rose" | "balkan" | "paper" | "outline";
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  download?: boolean;
}) {
  const t = {
    rose: "bg-rose text-white hover:bg-rose-hi",
    balkan: "bg-balkan text-ink hover:bg-paper [--lift:var(--color-balkan-deep)]",
    paper: "bg-paper text-ink hover:bg-white [--lift:var(--color-rose)]",
    outline: "border border-line text-paper hover:border-rose [--lift:var(--color-rose)]",
  }[tone];
  const cls = cn("lift-sm sheen inline-flex -skew-x-12 items-center px-4 py-2 text-sm font-black uppercase tracking-wide", t, className);
  const inner = <span className="inline-flex skew-x-12 items-center gap-2">{children}</span>;
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
    <button type={type} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function StageTabs({ options, index, onChange, locked = [] }: { options: string[]; index: number; onChange: (i: number) => void; locked?: number[] }) {
  const t = useDict();
  return <Tabs options={options} index={index} onChange={onChange} locked={locked} label={t.common.stage} />;
}
