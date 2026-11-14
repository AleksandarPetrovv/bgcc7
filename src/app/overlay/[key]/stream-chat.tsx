"use client";

import { AnimatePresence, motion } from "motion/react";
import type { FeedChat } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { Pfp } from "@/components/site/pfp";
import { EASE } from "@/lib/ease";
import { TEAM } from "./chrome";

const SIZE = {
  full: { row: 42, pfp: 28, name: "text-[18px]", text: "text-[18px]", gap: "gap-3", pad: "px-4" },
  compact: { row: 26, pfp: 20, name: "text-[15px]", text: "text-[15px]", gap: "gap-2", pad: "px-2" },
} as const;

const nameColor = (l: FeedChat) => (l.bot ? "var(--gold-hi)" : l.ref ? "var(--balkan-hi)" : l.side ? TEAM[l.side - 1].hi : "var(--paper)");

/** the lobby chat on stream: the newest `rows` lines, bottom-anchored, new lines rise in.
 *  one extra line sits clipped above the box so the oldest slides out instead of popping */
export function StreamChat({ lines, rows, size = "full", className, delay = 0 }: { lines: FeedChat[]; rows: number; size?: keyof typeof SIZE; className?: string; delay?: number }) {
  const s = SIZE[size];
  const shown = lines.slice(-(rows + 1));
  const framed = size === "full";
  return (
    <motion.div
      className={cn("relative", framed && "isolate py-2", className)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {framed && (
        <span
          className="absolute inset-0 -z-10 border-2 border-line bg-ink/85"
          style={{ boxShadow: "4px 4px 0 0 color-mix(in srgb, var(--rose-deep) 42%, transparent)" }}
          aria-hidden
        />
      )}
      <div className="flex flex-col justify-end overflow-hidden" style={{ height: rows * s.row }}>
        <AnimatePresence initial={false}>
          {shown.map((l) => (
            <motion.div
              key={l.key}
              layout="position"
              initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.35, ease: EASE }}
              className={cn("flex shrink-0 items-center", s.gap, s.pad)}
              style={{ height: s.row }}
            >
              <Pfp src={l.avatar} className="shrink-0" style={{ width: s.pfp, height: s.pfp }} />
              <span className={cn("shrink-0 font-display leading-none", l.ref ? "font-black" : "font-bold", s.name)} style={{ color: nameColor(l) }}>
                {l.name}
              </span>
              <span className={cn("min-w-0 truncate font-bold leading-none", s.text, l.bot ? "text-paper/70" : "text-paper")}>{l.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
