"use client";

import { useState } from "react";
import { TriTick } from "@/components/site/graphics";
import type { FeedTeam, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";

export const TEAM = [
  { c: "var(--color-rose)", hi: "var(--color-rose-hi)", deep: "var(--color-rose-deep)" },
  { c: "var(--color-azure)", hi: "var(--color-azure-hi)", deep: "var(--color-azure-deep)" },
] as const;

export const editionNum = (feed: OverlayFeed) => feed.edition.replace(/^\D+/, "") || "7";

export function Img({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src.trim() || failed === src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} decoding="async" onError={() => setFailed(src)} />;
}

export function Lockup({ num, size, className }: { num: string; size: number; className?: string }) {
  return (
    <div className={cn("flex select-none items-end font-display font-black lowercase", className)} style={{ fontSize: size }}>
      <span className="leading-[0.8] tracking-[-0.05em] text-paper">bgcc</span>
      <span className="relative mb-[-0.06em] ml-[0.04em] mr-[0.2em] text-[1.45em] italic leading-[0.74] tracking-[-0.06em]">
        <span className="absolute left-[0.05em] top-[0.035em] text-transparent [-webkit-text-stroke:2px_rgba(244,243,238,0.35)]" aria-hidden>
          {num}
        </span>
        <span className="relative text-rose">{num}</span>
      </span>
    </div>
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
        <div className="anim-drift h-full w-[calc(100%+120px)] bg-[repeating-linear-gradient(115deg,transparent_0_52.4px,rgba(255,255,255,0.035)_52.4px_54.4px)]" />
      </div>
      <div className="absolute right-[-60px] top-1/2 -translate-y-1/2 font-display text-[980px] font-black italic leading-[0.8] text-white/[0.03]">{num}</div>
      <FlagBar className="absolute inset-x-0 bottom-0" />
    </div>
  );
}

export function TopBar({ feed }: { feed: OverlayFeed }) {
  return (
    <header className="absolute inset-x-[72px] top-[52px] flex items-center justify-between">
      <div className="flex items-center gap-5">
        <TriTick className="h-[22px] w-[42px]" />
        <Lockup num={editionNum(feed)} size={38} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[17px] font-black uppercase tracking-[0.18em] text-ash">First to {feed.match.firstTo}</span>
        <span className="inline-flex -skew-x-12 border border-line bg-coal/80 px-6 py-2.5 shadow-[5px_5px_0_0_rgba(0,0,0,0.5)]">
          <span className="skew-x-12 text-[20px] font-black uppercase tracking-[0.14em] text-paper">{feed.match.round}</span>
        </span>
      </div>
    </header>
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
      <span className="absolute left-[0.06em] top-[0.05em] text-transparent [-webkit-text-stroke:2px_rgba(244,243,238,0.3)]" aria-hidden>
        vs
      </span>
      <span className="relative">vs</span>
    </span>
  );
}

export function Echo({ text, className, color = "var(--color-paper)" }: { text: React.ReactNode; className?: string; color?: string }) {
  return (
    <span className={cn("relative inline-block whitespace-nowrap font-display font-black italic leading-[0.9]", className)}>
      <span className="absolute left-[0.04em] top-[0.04em] text-transparent [-webkit-text-stroke:2px_rgba(244,243,238,0.28)]" aria-hidden>
        {text}
      </span>
      <span className="relative" style={{ color }}>
        {text}
      </span>
    </span>
  );
}
