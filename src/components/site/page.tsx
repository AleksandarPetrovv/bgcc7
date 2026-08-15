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
    <div className="sticky top-16 z-30 border-b border-line bg-coal/95 backdrop-blur lg:top-[72px]">
      <nav className="mx-auto flex max-w-6xl items-stretch gap-1 overflow-x-auto px-4 sm:gap-6 sm:px-6" aria-label={t.nav.section}>
        {items.map((i) => {
          const active = path === i.href;
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
        {["w-full bg-rose", "w-3/4 bg-paper/70", "w-1/2 bg-balkan"].map((c, i) => (
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
      <Sparkle className="left-0 top-[0.05em] size-[0.55em] text-rose-hi" delay={0.2} />
      <Sparkle className="bottom-0 right-0 size-[0.36em]" delay={0.9} />
      <Sparkle className="right-[0.05em] top-0 size-[0.2em] text-balkan" delay={1.5} />
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
    <span className="mb-[0.18em] flex self-end" aria-hidden>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 10 16" className="anim-chevron -ml-[0.06em] h-[0.42em] w-[0.26em] fill-rose first:ml-0" style={{ animationDelay: `${i * 0.18}s` }}>
          <polygon points="0,0 4,0 10,8 4,16 0,16 6,8" />
        </svg>
      ))}
    </span>
  );
}

function Orbit() {
  return (
    <span className="relative mb-[0.12em] inline-flex size-[0.62em] items-center justify-center self-end" aria-hidden>
      <span className="anim-pop block size-[0.22em] rotate-45 bg-rose" style={{ animationDelay: "0.25s" }} />
      <span className="absolute inset-0 rounded-full border border-dashed border-line" />
      <span className="anim-orbit absolute inset-0">
        <span className="absolute -top-[0.05em] left-1/2 block size-[0.1em] -translate-x-1/2 rounded-full bg-paper" />
      </span>
    </span>
  );
}

function Burst() {
  return (
    <span className="relative mb-[0.08em] inline-block size-[0.7em] self-end" aria-hidden>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((r, i) => (
        <span key={r} className="absolute left-1/2 top-1/2 block h-[0.05em] w-[0.5em] origin-left" style={{ transform: `rotate(${r}deg)` }}>
          <span className={cn("anim-burst block h-full w-[0.18em] translate-x-[0.12em]", i % 2 ? "bg-paper/60" : "bg-rose")} style={{ animationDelay: `${0.25 + i * 0.03}s` }} />
        </span>
      ))}
    </span>
  );
}

const MARKS = [Blocks, Streaks, Dots, Glints, Squiggle, Chevrons, Orbit, Burst];

const markFor = (node: React.ReactNode) => {
  const s = typeof node === "string" ? node : "";
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % MARKS.length;
};

export function PageTitle({
  children,
  accent,
  right,
  className,
}: {
  children: React.ReactNode;
  accent?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  const mark = markFor(children);
  return (
    <div className={cn("relative mb-8 flex flex-wrap items-end gap-x-8 gap-y-4 pb-3", className)}>
      <h1 className="heading-slam flex min-w-0 max-w-full flex-wrap items-end gap-x-[0.3em] break-words text-[clamp(2rem,8.5vw,3rem)] sm:text-6xl">
        <span className="anim-letter">{children}</span>
        {accent && (
          <span className="anim-letter text-rose-hi" style={{ animationDelay: "0.12s" }}>
            / {accent}
          </span>
        )}
        {MARKS.map((M, i) => i === mark && <M key={i} />)}
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

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6", className)}>{children}</div>;
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      className="heading-slam mb-5 mt-14 flex items-center gap-3 text-[clamp(1.6rem,7.5vw,2.25rem)] first:mt-0"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
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
