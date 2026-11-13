"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarClock, ChevronRight, ClipboardCheck, Disc3, Download, Dices, DoorOpen, LayoutGrid, Layers, Link2, MonitorPlay, Music2, ScrollText, Settings2, Shield, Swords, Trophy, Users } from "lucide-react";
import { TwitchLogo } from "@/components/site/twitch-logo";
import { DiscordLogo } from "@/components/site/discord-logo";
import { Sparkle } from "@/components/site/graphics";
import { cn } from "@/lib/utils";
import type { AdminKey } from "./menu";

const ICONS: Record<AdminKey, React.ComponentType<{ className?: string }>> = {
  phase: Layers,
  screening: ClipboardCheck,
  lobbies: DoorOpen,
  qualifiers: Trophy,
  mappools: Music2,
  teams: Users,
  draw: Disc3,
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

export function AdminNav({ items }: { items: { key: AdminKey; href: string; label: string; locked: boolean }[] }) {
  const path = usePathname();
  // phones: up to 7 a row, rows balanced, so a few sections spread out and get bigger
  const open = items.filter((i) => i.key !== "helper" && !i.locked).length || 1;
  const cols = Math.ceil(open / Math.ceil(open / 7));
  const big = cols <= 5;
  return (
    <nav style={{ "--cols": cols } as React.CSSProperties} className="flex flex-wrap justify-center gap-y-1.5 py-2 lg:flex-col lg:flex-nowrap lg:justify-start lg:gap-1 lg:py-3" aria-label="Admin">
      {items.map((i, n) => {
        const key = i.key;
        const Icon = ICONS[key];
        const active = path.startsWith(i.href);
        return (
          <Fragment key={i.href}>
          {/* phones: sections closed by the phase start a row of their own */}
          {i.locked && !items[n - 1]?.locked && <span className="basis-full lg:hidden" aria-hidden />}
          <Link
            href={i.href}
            aria-current={active ? "page" : undefined}
            aria-label={i.label}
            title={i.label}
            className={cn(
              "group relative flex min-w-0 flex-none basis-[calc(100%/var(--cols))] items-center justify-center gap-3 whitespace-nowrap py-2 lg:basis-auto lg:justify-start lg:whitespace-normal lg:px-2.5 text-[0.8rem] font-display font-bold transition-colors duration-200",
              active ? "text-paper" : key === "helper" ? "text-balkan-hi hover:text-paper" : "text-ash hover:text-paper",
              // phones can't run the helper: no icon there, the page still opens
              key === "helper" && "hidden lg:flex",
              key === "helper" && !active && "lg:mb-2",
              // closed by the phase: set apart from the rest by one row's height
              i.locked && !items[n - 1]?.locked && "lg:mt-11",
            )}
          >
            {active && (
              <>
                <motion.span layoutId="admin-nav-active" transition={spring} className="absolute inset-x-1 bottom-0 h-[3px] -skew-x-12 bg-rose lg:inset-x-auto lg:inset-y-1.5 lg:left-0 lg:h-auto lg:w-[3px] lg:skew-x-0 lg:-skew-y-12" aria-hidden />
                <motion.span layoutId="admin-nav-spark" transition={spring} className="absolute right-0.5 top-0 size-3 lg:hidden" aria-hidden>
                  <Sparkle className="inset-0 size-full text-rose-hi" />
                </motion.span>
              </>
            )}
            <span
              className={cn(
                "relative flex shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform,translate,scale,rotate] duration-300 lg:size-7",
                big ? "size-10" : "size-7",
                active ? "bg-rose/20 text-rose-hi" : key === "helper" ? "bg-balkan/20 group-hover:-translate-y-0.5" : "bg-slate group-hover:-translate-y-0.5 group-hover:bg-rose/20 group-hover:text-rose-hi",
              )}
            >
              <Icon className={cn("lg:size-3.5", big ? "size-[1.15rem]" : "size-3.5")} />
            </span>
            <span className="relative hidden min-w-0 flex-1 leading-tight transition-transform duration-300 group-hover:translate-x-0.5 lg:block">{i.label}</span>
            {!active && <ChevronRight className="relative hidden size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-70 lg:block" aria-hidden />}
          </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
