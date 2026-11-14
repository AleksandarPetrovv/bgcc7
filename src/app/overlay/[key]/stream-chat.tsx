"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, motion, useMotionValue } from "motion/react";
import type { FeedChat } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { Pfp } from "@/components/site/pfp";
import { CALM, EASE } from "@/lib/ease";
import { TEAM } from "./chrome";

const SIZE = {
  full: { row: 42, pfp: 28, name: "text-[18px]", text: "text-[18px]", gap: "gap-3" },
  compact: { row: 26, pfp: 20, name: "text-[15px]", text: "text-[15px]", gap: "gap-2" },
} as const;

// chat scrolls with a slow in-out curve instead of the house ease-out, which reads as a jump at the start of each scroll

const nameColor = (l: FeedChat) => (l.ref ? "var(--balkan-hi)" : l.side ? TEAM[l.side - 1].hi : "var(--paper)");

/** the lobby chat on stream: the newest `rows` lines, bottom-anchored. new lines push the whole list up in one slide that
 *  starts from wherever the list is, so lines never snap first; one extra line sits above the box and fades out under the top mask */
export function StreamChat({ lines, rows, size = "full", className, delay = 0 }: { lines: FeedChat[]; rows: number; size?: keyof typeof SIZE; className?: string; delay?: number }) {
  const s = SIZE[size];
  const shown = lines.slice(-(rows + 1));
  const keys = shown.map((l) => l.key).join("\n");
  const seen = useRef<Set<string> | null>(null);
  const y = useMotionValue(0);

  // runs before paint: the list is pushed back down by the new lines' height, then slides up to rest
  useLayoutEffect(() => {
    const now = new Set(keys.split("\n").filter(Boolean));
    const before = seen.current;
    seen.current = now;
    if (!before) return;
    const added = [...now].filter((k) => !before.has(k)).length;
    if (!added) return;
    const run = animate(y, [y.get() + Math.min(added, rows + 1) * s.row, 0], CALM);
    return () => run.stop();
  }, [keys, rows, s.row, y]);

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24, transition: { duration: 0.25, ease: EASE } }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      <div
        className="flex flex-col justify-end overflow-hidden"
        style={{ height: rows * s.row, maskImage: `linear-gradient(to bottom, transparent, #000 ${s.row * 0.5}px)` }}
      >
        <motion.div style={{ y }}>
          {shown.map((l) => (
            <motion.div
              key={l.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={CALM}
              className={cn("flex items-center", s.gap)}
              style={{ height: s.row }}
            >
              <Pfp src={l.avatar} className="shrink-0" style={{ width: s.pfp, height: s.pfp }} />
              <span className={cn("shrink-0 font-display leading-none", l.ref ? "font-black" : "font-bold", s.name)} style={{ color: nameColor(l) }}>
                {l.name}
              </span>
              <span className={cn("min-w-0 truncate font-bold leading-none text-paper", s.text)}>{l.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
