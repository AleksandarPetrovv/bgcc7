"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { FeedTeam, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { TEAM as SIDE } from "@/lib/theme";
import { editionNumber } from "@/lib/format";
import { EASE } from "@/lib/ease";

// overlay feeds count sides from 0
export const TEAM = [SIDE[1], SIDE[2]] as const;

export const editionNum = (feed: OverlayFeed) => editionNumber(feed.edition) || "7";

export function Img({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src.trim() || failed === src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} style={style} decoding="async" onError={() => setFailed(src)} />;
}

export const LABEL = "text-[15px] font-display font-bold text-ash";

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

export function TopBar({ feed }: { feed: OverlayFeed }) {
  return (
    <motion.header
      className="absolute inset-x-[72px] top-[52px] flex items-center justify-between"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <Lockup num={editionNum(feed)} size={38} />
      <span className="text-[22px] font-display font-bold text-rose-hi">{feed.match.round}</span>
    </motion.header>
  );
}

// the site's match-card underline: team picture with a team-coloured bottom edge
export function TeamPic({ src, side, size, className }: { src: string; side: 0 | 1 | null; size: number; className?: string }) {
  if (!src.trim()) return null;
  return (
    <span className={cn("inline-flex shrink-0 overflow-hidden bg-slate", className)} style={{ width: size, height: size, borderBottom: `${Math.max(3, Math.round(size / 28))}px solid ${side === null ? "var(--gold)" : TEAM[side].c}` }}>
      <Img src={src} className="size-full object-cover" />
    </span>
  );
}

export function TeamPlate({ team, side, big, className }: { team: FeedTeam; side: 0 | 1; big?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-4", side === 1 && "flex-row-reverse text-right", className)}>
      <TeamPic src={team.image} side={side} size={big ? 72 : 48} />
      <span className={cn("min-w-0 truncate font-display font-black leading-none", big ? "text-[44px]" : "text-[30px]")}>{team.name}</span>
    </div>
  );
}

// slanted box where only the background layer is skewed, so the text inside stays crisp
export function Slant({ className, layer, style, children }: { className?: string; layer?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <span className={cn("relative isolate inline-flex", className)}>
      <span className={cn("absolute inset-0 -z-10 -skew-x-12", layer)} style={style} aria-hidden />
      {children}
    </span>
  );
}

// the boxed, team-outlined plate used in the mappool and gameplay headers
export function SlabPlate({ team, side, className }: { team: FeedTeam; side: 0 | 1; className?: string }) {
  const c = TEAM[side];
  return (
    <Slant className={cn("min-w-0 shrink items-center px-5 py-2", className)} layer="border-2 bg-coal/95" style={{ borderColor: c.c, boxShadow: `6px 6px 0 0 ${c.deep}` }}>
      <span className={cn("flex min-w-0 items-center gap-3", side === 1 && "flex-row-reverse")}>
        {team.image.trim() && <Img src={team.image} className="size-[40px] shrink-0 object-cover" />}
        <span className="min-w-0 truncate font-display text-[28px] font-black leading-none">{team.name}</span>
      </span>
    </Slant>
  );
}

// one diamond per point needed, filled as maps are won
export function Points({ score, firstTo, side }: { score: number; firstTo: number; side: 0 | 1 }) {
  return (
    <span className={cn("flex items-center gap-2", side === 1 && "flex-row-reverse")} aria-label={`${score} of ${firstTo}`}>
      {Array.from({ length: firstTo }, (_, i) => (
        <span key={i} className="relative size-[19px] rotate-45 border-[3px]" style={{ borderColor: TEAM[side].c }}>
          {i < score && (
            <motion.span
              className="absolute inset-0"
              style={{ background: TEAM[side].c }}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 16 }}
            />
          )}
          {i === score - 1 && (
            <motion.span
              key={`ring${score}`}
              className="absolute -inset-1 border-2"
              style={{ borderColor: TEAM[side].hi }}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          )}
        </span>
      ))}
    </span>
  );
}

// plate at the outer edge, the diamonds centred in whatever room is left before the middle column
export function HeaderSide({ team, side, score, firstTo }: { team: FeedTeam; side: 0 | 1; score: number; firstTo: number }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-6", side === 1 && "flex-row-reverse")}>
      <SlabPlate team={team} side={side} className="max-w-[440px]" />
      <div className="flex min-w-0 flex-1 justify-center">
        <Points score={score} firstTo={firstTo} side={side} />
      </div>
    </div>
  );
}

// both team pictures fading in from the outer edges, like the big match cards on the site
export function Blend({ teams, winner }: { teams: FeedTeam[]; winner?: 1 | 2 | null }) {
  return (
    // each picture fills its whole half and only fades where the two meet in the middle; heavy blur, low opacity so it stays a backdrop
    <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
      {teams.map((team, i) => (
        <div key={i} className="relative w-1/2 overflow-hidden">
          <Img
            src={team.image}
            className={cn(
              "size-full scale-125 object-cover blur-[28px] mix-blend-multiply",
              i ? "[mask-image:linear-gradient(to_left,black_65%,transparent)]" : "[mask-image:linear-gradient(to_right,black_65%,transparent)]",
              winner && winner !== i + 1 ? "opacity-[0.04] grayscale" : "opacity-[0.09] grayscale-[40%]",
            )}
          />
        </div>
      ))}
    </div>
  );
}

// the site's section rule: a line with one pink diamond in the middle
export function Rule({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-px bg-line", className)} aria-hidden>
      <span className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-rose" />
    </div>
  );
}

export function Versus({ size = 72 }: { size?: number }) {
  return (
    <span className="heading-slam shrink-0 leading-none text-paper" style={{ fontSize: size }}>
      VS
    </span>
  );
}

export function Echo({ text, className, color = "var(--paper)" }: { text: React.ReactNode; className?: string; color?: string }) {
  return (
    <span className={cn("heading-slam inline-block whitespace-nowrap leading-[0.9]", className)} style={{ color }}>
      {text}
    </span>
  );
}

export function PlayerCard({ p, side, size = 150, delay = 0 }: { p: FeedTeam["players"][number]; side: 0 | 1 | null; size?: number; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className="flex flex-col items-center gap-2"
      style={{ minWidth: size + 40, maxWidth: size + 140 }}
    >
      <TeamPic src={p.avatar} side={side} size={size} />
      <span className="mt-1 max-w-full truncate px-1 font-display text-[26px] font-black leading-tight">{p.name}</span>
      <span className="flex items-center gap-2">
        {p.country && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://flagcdn.com/w80/${p.country.toLowerCase()}.png`} alt="" className="h-[16px]" />
        )}
        {p.rank ? <span className="num text-[18px] text-ash">#{p.rank.toLocaleString("en-US")}</span> : null}
      </span>
    </motion.div>
  );
}
