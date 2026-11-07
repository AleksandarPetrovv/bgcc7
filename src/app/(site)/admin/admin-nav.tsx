"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarClock, ChevronRight, ClipboardCheck, Download, Dices, DoorOpen, Gauge, LayoutGrid, Layers, Link2, MonitorPlay, Music2, ScrollText, Settings2, Shield, Swords, Trophy, Users } from "lucide-react";
import { TwitchLogo } from "@/components/site/twitch-logo";
import { DiscordLogo } from "@/components/site/discord-logo";
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
  scheduling: CalendarClock,
  draft: Dices,
  site: Link2,
  staff: Shield,
  log: ScrollText,
  settings: Settings2,
  discord: DiscordLogo,
  format: LayoutGrid,
  helper: Download,
  stream: TwitchLogo,
  overlay: MonitorPlay,
};

const spring = { type: "spring", stiffness: 520, damping: 42 } as const;

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="grid grid-cols-8 gap-x-0.5 gap-y-1.5 py-2 lg:flex lg:flex-col lg:justify-start lg:gap-1 lg:py-3" aria-label="Admin">
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
              "group relative flex min-w-0 flex-1 items-center justify-center gap-3 whitespace-nowrap py-2 lg:flex-none lg:justify-start lg:whitespace-normal lg:px-2.5 text-[0.8rem] font-display font-bold transition-colors duration-200",
              active ? "text-paper" : key === "helper" ? "text-balkan-hi hover:text-paper" : "text-ash hover:text-paper",
              key === "helper" && !active && "lg:mb-2",
            )}
          >
            {active && (
              <>
                {/* the main nav's underline, stood on its side on desktop */}
                <motion.span layoutId="admin-nav-active" transition={spring} className="absolute inset-x-1 bottom-0 h-[3px] -skew-x-12 bg-rose lg:inset-x-auto lg:inset-y-1.5 lg:left-0 lg:h-auto lg:w-[3px] lg:skew-x-0 lg:-skew-y-12" aria-hidden />
                <motion.span layoutId="admin-nav-spark" transition={spring} className="absolute right-0.5 top-0 size-3 lg:hidden" aria-hidden>
                  <Sparkle className="inset-0 size-full text-rose-hi" />
                </motion.span>
              </>
            )}
            <span
              className={cn(
                "relative flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform,translate,scale,rotate] duration-300",
                active ? "bg-rose/20 text-rose-hi" : key === "helper" ? "bg-balkan/20 group-hover:scale-110" : "bg-slate group-hover:scale-110 group-hover:bg-rose/20 group-hover:text-rose-hi",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <span className="relative hidden min-w-0 flex-1 leading-tight transition-transform duration-300 group-hover:translate-x-0.5 lg:block">{i.label}</span>
            {!active && <ChevronRight className="relative hidden size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-70 lg:block" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
