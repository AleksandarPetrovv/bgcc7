"use client";

import { useId } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Sparkle } from "./graphics";

const spring = { type: "spring", stiffness: 520, damping: 42 } as const;

function Pill({ id, active, spark }: { id: string; active: boolean; spark?: boolean }) {
  if (!active) return null;
  return (
    <>
      <motion.span layoutId={`${id}-bar`} transition={spring} className="absolute inset-x-1.5 bottom-0 h-[3px] -skew-x-12 bg-rose" aria-hidden />
      {spark && <motion.span layoutId={`${id}-spark`} transition={spring} className="absolute -top-0.5 right-0 size-3" aria-hidden>
        <Sparkle className="inset-0 size-full text-rose-hi" />
      </motion.span>}
    </>
  );
}

const item = (active: boolean, extra?: string) =>
  cn(
    "group relative inline-flex min-h-9 shrink-0 items-center gap-2 px-1.5 pt-1.5 pb-2 text-sm font-display font-bold transition-colors duration-200",
    active ? "text-paper" : "text-ash hover:text-paper",
    extra,
  );


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
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1", className)} role="tablist" aria-label={label}>
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
          <Pill id={id} active={i === index} />
          <span className="relative inline-flex items-center gap-2">{o}</span>
        </button>
      ))}
    </div>
  );
}

// spark: the nav sparkle on the active tab, only on a few public pages
export function LinkTabs({ items, label, className, spark }: { items: { href: string; label: React.ReactNode; active: boolean; disabled?: boolean }[]; label?: string; className?: string; spark?: boolean }) {
  const id = useId();
  return (
    <nav className={cn("flex flex-wrap gap-x-4 gap-y-1", className)} aria-label={label}>
      {items.map((t) =>
        t.disabled ? (
          <span key={t.href} aria-disabled className={item(false, "cursor-not-allowed text-paper/45 hover:text-paper/45")}>
            {t.label}
          </span>
        ) : (
        <Link key={t.href} href={t.href} scroll={false} aria-current={t.active ? "page" : undefined} className={item(t.active)}>
          <Pill id={id} active={t.active} spark={spark} />
          <span className="relative inline-flex items-center gap-2">{t.label}</span>
        </Link>
        ),
      )}
    </nav>
  );
}
