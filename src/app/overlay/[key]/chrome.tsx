"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { FeedTeam, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";

export const TEAM = [
  { c: "var(--crimson)", hi: "var(--crimson-hi)", deep: "var(--crimson-deep)" },
  { c: "var(--azure)", hi: "var(--azure-hi)", deep: "var(--azure-deep)" },
] as const;

export const editionNum = (feed: OverlayFeed) => feed.edition.replace(/^\D+/, "") || "7";

export function Img({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src.trim() || failed === src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} style={style} decoding="async" onError={() => setFailed(src)} />;
}

export const SLAB = "color-mix(in srgb, var(--rose-deep) 42%, transparent)";

export const LABEL = "text-[15px] font-display font-bold text-ash";
const EASE = [0.16, 1, 0.3, 1] as const;

export function Lockup({ num, size, className, animate, invert }: { num: string; size: number; className?: string; animate?: boolean; invert?: boolean }) {
  return (
    <div className={cn("flex select-none items-end font-display font-black lowercase", className)} style={{ fontSize: size }}>
      <span className={cn("flex leading-[0.8] tracking-[-0.05em]", invert ? "text-white" : "text-paper")}>
        {"bgcc".split("").map((c, i) => (
          <motion.span key={i} initial={animate ? { y: "0.5em", opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.05 + i * 0.07, ease: EASE }}>
            {c}
          </motion.span>
        ))}
      </span>
      <motion.span
        className="relative mb-[-0.06em] ml-[0.04em] mr-[0.2em] text-[1.45em] italic leading-[0.74] tracking-[-0.06em]"
        initial={animate ? { scale: 1.8, opacity: 0, rotate: -8 } : false}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.35 }}
      >
        <span className="absolute left-[0.05em] top-[0.035em] text-transparent [-webkit-text-stroke:2px_color-mix(in_srgb,var(--rose-deep)_45%,transparent)]" aria-hidden>
          {num}
        </span>
        <span className={cn("relative", invert ? "text-gold" : "text-rose")}>{num}</span>
      </motion.span>
    </div>
  );
}

export function ScoreNum({ value, side, className, style }: { value: number; side: 0 | 1; className?: string; style?: React.CSSProperties }) {
  const [last, setLast] = useState(value);
  const [bump, setBump] = useState(0);
  if (value !== last) {
    if (value > last) setBump(bump + 1);
    setLast(value);
  }
  return (
    <span className="relative inline-flex justify-center">
      <motion.span
        key={value}
        className={className}
        style={style}
        initial={bump ? { scale: 1.9, y: -12, opacity: 0 } : false}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 17 }}
      >
        {value}
      </motion.span>
      <AnimatePresence>
        {bump > 0 && (
          <motion.span
            key={bump}
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 font-display text-[0.55em] font-black italic"
            style={{ color: TEAM[side].hi, textShadow: "0 0 14px var(--white)" }}
            initial={{ opacity: 1, y: 0, scale: 0.7 }}
            animate={{ opacity: 0, y: "-1.6em", scale: 1.25 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            +1
          </motion.span>
        )}
      </AnimatePresence>
      {bump > 0 && (
        <motion.span
          key={`ring${bump}`}
          className="pointer-events-none absolute inset-0 m-auto size-[1em] rounded-full border-4"
          style={{ borderColor: TEAM[side].c }}
          initial={{ scale: 0.4, opacity: 0.9 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          aria-hidden
        />
      )}
    </span>
  );
}

export function FlagBar({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[6px]", className)} aria-hidden>
      <span className="flex-1 bg-paper" />
      <span className="flex-1 bg-balkan" />
      <span className="flex-1 bg-rose" />
    </div>
  );
}

export function Backdrop({ num, tint }: { num: string; tint?: string }) {
  return (
    <div className="grain absolute inset-0 overflow-hidden bg-ink" aria-hidden>
      {tint && <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(ellipse at 70% 55%, ${tint} 0%, transparent 60%)` }} />}
      <div className="absolute inset-y-0 right-0 w-[75%] overflow-hidden [mask-image:linear-gradient(to_left,black,transparent)]">
        <div className="anim-drift h-full w-[calc(100%+120px)] bg-[repeating-linear-gradient(115deg,transparent_0_52.4px,color-mix(in_srgb,var(--rose)_6%,transparent)_52.4px_54.4px)]" />
      </div>
      <div className="absolute right-[-160px] top-1/2 -translate-y-1/2 font-display text-[1500px] font-black italic leading-[0.8] text-rose/[0.07] blur-[14px]">{num}</div>
      <FlagBar className="absolute inset-x-0 bottom-0" />
    </div>
  );
}

export function TopBar({ feed, invert }: { feed: OverlayFeed; invert?: boolean }) {
  return (
    <motion.header
      className="absolute inset-x-[72px] top-[52px] flex items-center justify-between"
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="flex items-center gap-5">
        <Lockup num={editionNum(feed)} size={38} invert={invert} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[17px] font-display font-bold text-ash">First to {feed.match.firstTo}</span>
        <span className="inline-flex -skew-x-12 border border-line bg-coal/90 px-6 py-2.5 shadow-[5px_5px_0_0_color-mix(in_srgb,var(--rose-deep)_42%,transparent)]">
          <span className="skew-x-12 text-[20px] font-display font-bold text-paper">{feed.match.round}</span>
        </span>
      </div>
    </motion.header>
  );
}

export function TeamPlate({ team, side, big, className }: { team: FeedTeam; side: 0 | 1; big?: boolean; className?: string }) {
  const c = TEAM[side];
  return (
    <div
      className={cn("inline-flex min-w-0 -skew-x-12 items-center border-2 bg-coal/95", big ? "px-10 py-5" : "px-7 py-3", className)}
      style={{ borderColor: c.c, boxShadow: `7px 7px 0 0 ${c.deep}` }}
    >
      <div className={cn("flex min-w-0 skew-x-12 items-center gap-4", side === 1 && "flex-row-reverse")}>
        {team.image.trim() && <Img src={team.image} className={cn("shrink-0 object-cover", big ? "size-[64px]" : "size-[44px]")} />}
        <span className={cn("min-w-0 truncate font-display font-black leading-none", big ? "text-[44px]" : "text-[30px]")}>{team.name}</span>
      </div>
    </div>
  );
}

export function Versus({ size = 72 }: { size?: number }) {
  return (
    <span className="relative shrink-0 font-display font-black italic leading-none text-paper" style={{ fontSize: size }}>
      <span className="absolute left-[0.06em] top-[0.05em] text-transparent [-webkit-text-stroke:2px_color-mix(in_srgb,var(--rose-deep)_45%,transparent)]" aria-hidden>
        vs
      </span>
      <span className="relative">vs</span>
    </span>
  );
}

export function Echo({ text, className, color = "var(--paper)" }: { text: React.ReactNode; className?: string; color?: string }) {
  return (
    <span className={cn("relative inline-block whitespace-nowrap font-display font-black italic leading-[0.9]", className)}>
      <span className="absolute left-[0.04em] top-[0.04em] text-transparent [-webkit-text-stroke:2px_color-mix(in_srgb,var(--rose-deep)_45%,transparent)]" aria-hidden>
        {text}
      </span>
      <span className="relative" style={{ color }}>
        {text}
      </span>
    </span>
  );
}

export function PlayerCard({ p, color, deep, fg = "var(--white)", size = 150, delay = 0 }: { p: FeedTeam["players"][number]; color: string; deep: string; fg?: string; size?: number; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 34, rotate: -4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className="flex flex-col items-center gap-3"
      style={{ minWidth: size + 60, maxWidth: size + 160 }}
    >
      <span className="relative inline-flex">
        <span className="inline-flex shrink-0 -skew-x-12 overflow-hidden border-[3px] bg-ink" style={{ borderColor: color, boxShadow: `9px 9px 0 0 ${deep}` }}>
          <Img src={p.avatar} className="skew-x-12 scale-[1.25] object-cover" style={{ width: size, height: size }} />
        </span>
        {p.country && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://flagcdn.com/w80/${p.country.toLowerCase()}.png`} alt="" className="absolute -bottom-3 -left-5 h-[28px] border-2 border-ink shadow-[3px_3px_0_0_color-mix(in_srgb,var(--rose-deep)_42%,transparent)]" />
        )}
      </span>
      <span className="mt-3 max-w-full truncate px-1 font-display text-[28px] font-black leading-tight">{p.name}</span>
      {p.rank ? (
        <span className="inline-flex -skew-x-12 px-3 py-0.5" style={{ background: color }}>
          <span className="num skew-x-12 text-[17px] font-black" style={{ color: fg }}>#{p.rank.toLocaleString("en-US")}</span>
        </span>
      ) : null}
    </motion.div>
  );
}
