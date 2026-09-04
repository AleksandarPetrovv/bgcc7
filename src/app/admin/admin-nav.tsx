"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, ClipboardCheck, DoorOpen, Gauge, Layers, Link2, Music2, ScrollText, Settings2, Shield, Swords, Trophy, Users } from "lucide-react";
import { Sparkle } from "@/components/site/graphics";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: Gauge,
  phase: Layers,
  screening: ClipboardCheck,
  lobbies: DoorOpen,
  qualifiers: Trophy,
  mappools: Music2,
  teams: Users,
  matches: Swords,
  site: Link2,
  staff: Shield,
  log: ScrollText,
  settings: Settings2,
};

const spring = { type: "spring", stiffness: 520, damping: 42 } as const;

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex justify-between gap-0.5 p-1.5 lg:flex-col lg:justify-start lg:gap-1 lg:p-3" aria-label="Admin">
      {items.map((i) => {
        const key = i.href.split("/")[2] ?? "overview";
        const Icon = ICONS[key] ?? Gauge;
        const active = i.href === "/admin" ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            aria-label={i.label}
            title={i.label}
            className={cn(
              "group relative flex min-w-0 flex-1 items-center justify-center gap-3 whitespace-nowrap py-2 lg:flex-none lg:justify-start lg:px-2.5 text-[0.8rem] font-black uppercase tracking-wide transition-colors duration-200",
              active ? "text-white" : "text-ash hover:text-paper",
            )}
          >
            {active && (
              <>
                <motion.span layoutId="admin-nav-shadow" transition={spring} className="absolute inset-0 translate-x-1 translate-y-1 -skew-x-6 bg-rose-deep" aria-hidden />
                <motion.span layoutId="admin-nav-active" transition={spring} className="absolute inset-0 -skew-x-6 bg-rose" aria-hidden />
              </>
            )}
            <span
              className={cn(
                "relative flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-300",
                active ? "bg-white/20" : "bg-slate group-hover:scale-110 group-hover:bg-rose/20 group-hover:text-rose-hi",
              )}
            >
              <Icon className={cn("size-3.5", active && "anim-bob")} />
            </span>
            <span className="relative hidden flex-1 transition-transform duration-300 group-hover:translate-x-0.5 lg:block">{i.label}</span>
            {active ? (
              <span className="relative hidden size-4 lg:block" aria-hidden>
                <Sparkle className="inset-0 size-3.5 text-white" />
              </span>
            ) : (
              <ChevronRight className="relative hidden size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-70 lg:block" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
