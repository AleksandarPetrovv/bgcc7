"use client";

import { motion } from "motion/react";
import type { DrawPlayer } from "@/lib/draw";
import { useDict } from "@/components/site/lang";
import { Pfp } from "@/components/site/pfp";
import { SlantBg } from "@/components/site/slant";
import { Wordmark } from "@/components/site/graphics";
import { Confetti } from "@/components/site/confetti";
import { cn } from "@/lib/utils";

const at = (i: number, d: number, s = 0.07) => ({ "--i": i, "--d": `${d}s`, "--s": `${s}s` }) as React.CSSProperties;

/** the line-up by seed once the host ends a full draw: the whole page for viewers, a smaller view in place of the wheels for admin (`compact`) */
export function DrawFinale({ teams, compact }: { teams: { a: DrawPlayer; b: DrawPlayer; avg?: number }[]; compact?: boolean }) {
  const t = useDict();
  return (
    <motion.div className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      {/* viewers: fixed so the glow covers the whole screen, not just the padded column */}
      <div className={cn("pointer-events-none inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,color-mix(in_srgb,var(--gold)_22%,transparent),transparent)]", compact ? "absolute" : "fixed")} aria-hidden />
      {!compact && <Confetti duration={3200} />}
      <div className={cn("relative mx-auto flex w-full max-w-[112rem] flex-col justify-center", compact ? "py-2" : "min-h-[85dvh] py-6")}>
        <header className={cn("flex flex-col items-center text-center", compact ? "mb-6 pt-8" : "mb-8 pt-8 sm:mb-12 sm:pt-9")}>
          {!compact && (
            <span className="in-drop" style={at(0, 0.2)}>
              <Wordmark size="md" className="text-paper" />
            </span>
          )}
          <h2 className={cn("in-slam heading-slam", compact ? "text-3xl sm:text-4xl" : "mt-3 text-5xl sm:text-7xl")} style={at(0, 0.35)}>
            {t.wheel.finalTitle}
          </h2>
          <div className="mt-4 flex items-center gap-3" aria-hidden>
            <span className="in-grow h-px w-16 origin-right bg-gold sm:w-24" style={at(0, 0.6)} />
            <span className="in-pop size-2 rotate-45 bg-gold" style={at(0, 0.7)} />
            <span className="in-grow h-px w-16 bg-gold sm:w-24" style={at(0, 0.6)} />
          </div>
        </header>
        <ol className={cn("grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-4", compact ? "gap-3" : "gap-4 lg:gap-5")}>
          {teams.map(({ a, b, avg }, k) => (
            <li key={a.id} className={cn("in-pop relative isolate flex min-w-0 items-center", compact ? "gap-3 px-4 py-3" : "gap-4 px-6 py-5")} style={at(k, 0.9)}>
              <SlantBg className="border-2 border-line bg-coal shadow-[4px_4px_0_0_var(--gold-deep)]" />
              <span className="flex shrink-0">
                <Pfp src={a.avatar} crown className={cn("relative z-10 shadow-[0_0_0_3px_var(--coal)]", compact ? "size-10" : "size-14")} />
                <Pfp src={b.avatar} className={cn("shadow-[0_0_0_3px_var(--coal)]", compact ? "-ml-3 size-10" : "-ml-4 size-14")} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className={cn("truncate font-display font-black text-paper", compact ? "text-sm" : "text-base")}>{a.name}</span>
                <span className={cn("truncate text-ash", compact ? "text-xs" : "text-sm")}>{b.name}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end leading-none">
                <span className={cn("num text-gold", compact ? "text-base" : "text-xl")}>#{k + 1}</span>
                {avg !== undefined && <span className={cn("num mt-1 text-ash", compact ? "text-[0.65rem]" : "text-xs")}>{t.wheel.avgSeed(avg)}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
}
