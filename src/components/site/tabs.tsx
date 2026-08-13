"use client";

import { useId } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const spring = { type: "spring", stiffness: 520, damping: 42 } as const;

function Pill({ id, active }: { id: string; active: boolean }) {
  if (!active) return null;
  return (
    <>
      <motion.span layoutId={`${id}-shadow`} transition={spring} className="absolute inset-0 translate-x-[3px] translate-y-[3px] -skew-x-12 bg-rose-deep" aria-hidden />
      <motion.span layoutId={`${id}-pill`} transition={spring} className="absolute inset-0 -skew-x-12 bg-rose" aria-hidden />
    </>
  );
}

const item = (active: boolean, extra?: string) =>
  cn(
    "group relative inline-flex min-h-9 shrink-0 items-center gap-2 px-3.5 text-xs font-black uppercase tracking-wide transition-colors duration-200",
    active ? "text-white" : "text-ash hover:text-paper",
    extra,
  );

const hoverBg = "absolute inset-0 -skew-x-12 bg-white/0 transition-colors duration-200 group-hover:bg-white/[0.05]";

export function Tabs({
  options,
  index,
  onChange,
  locked = [],
  label,
  className,
}: {
  options: React.ReactNode[];
  index: number;
  onChange: (i: number) => void;
  locked?: number[];
  label?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-wrap gap-1", className)} role="tablist" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === index}
          disabled={locked.includes(i)}
          onClick={() => onChange(i)}
          className={item(i === index, "disabled:cursor-not-allowed disabled:opacity-35")}
        >
          {i !== index && <span className={hoverBg} aria-hidden />}
          <Pill id={id} active={i === index} />
          <span className="relative inline-flex items-center gap-2">{o}</span>
        </button>
      ))}
    </div>
  );
}

export function LinkTabs({ items, label, className }: { items: { href: string; label: React.ReactNode; active: boolean }[]; label?: string; className?: string }) {
  const id = useId();
  return (
    <nav className={cn("flex flex-wrap gap-1", className)} aria-label={label}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} scroll={false} aria-current={t.active ? "page" : undefined} className={item(t.active)}>
          {!t.active && <span className={hoverBg} aria-hidden />}
          <Pill id={id} active={t.active} />
          <span className="relative inline-flex items-center gap-2">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
