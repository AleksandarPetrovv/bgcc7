"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { MODS } from "@/lib/data";
import type { LiveClient, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { editionNum, FlagBar, Img, Lockup, TEAM } from "./chrome";

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Count = memo(function Count({ value, decimals = false, reduced, signed = false }: { value: number; decimals?: boolean; reduced: boolean; signed?: boolean }) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const fmt = (v: number) => `${signed && v > 0 ? "+" : ""}${(decimals ? decimal : integer).format(signed ? Math.abs(v) : v)}`;
  const [initial] = useState(() => fmt(value));
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const from = shown.current;
    let frame = 0;
    const format = (v: number) => `${signed && v > 0 ? "+" : ""}${(decimals ? decimal : integer).format(signed ? Math.abs(v) : v)}`;
    if (reduced || from === value) {
      shown.current = value;
      el.textContent = format(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 95);
      shown.current = from + (value - from) * p;
      el.textContent = format(shown.current);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, reduced, signed]);
  return <span ref={node}>{initial}</span>;
});

function Points({ score, firstTo, side }: { score: number; firstTo: number; side: 0 | 1 }) {
  return (
    <span className={cn("flex items-center gap-2", side === 1 && "flex-row-reverse")} aria-label={`${score} of ${firstTo}`}>
      {Array.from({ length: firstTo }, (_, i) => (
        <span key={i} className="size-[15px] rotate-45 border-2" style={{ borderColor: TEAM[side].c, background: i < score ? TEAM[side].c : "transparent" }} />
      ))}
    </span>
  );
}

function Player({ c, side, reduced }: { c: LiveClient; side: 0 | 1; reduced: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-baseline gap-3 text-[17px]", side === 1 && "flex-row-reverse", c.failed && "opacity-50")}>
      <span className="min-w-0 max-w-[150px] truncate font-black">{c.name}</span>
      <span className="num font-black text-paper/90">
        <Count value={c.score} reduced={reduced} />
      </span>
      <span className="num text-[15px] font-bold text-ash">
        <Count value={c.accuracy} decimals reduced={reduced} />% · <Count value={c.combo} reduced={reduced} />x
      </span>
    </div>
  );
}

const len = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s)) % 60).padStart(2, "0")}`;

export function GameplayScene({ feed }: { feed: OverlayFeed }) {
  const reduced = useReducedMotion() !== false;
  const { live, current } = feed;
  const total = live ? live.totals[0] + live.totals[1] : 0;
  const share = total > 0 && live ? live.totals[0] / total : 0.5;
  const diff = live ? live.totals[0] - live.totals[1] : 0;
  const mod = current ? Object.values(MODS).find((m) => current.slot.toUpperCase().startsWith(m.short)) : undefined;

  return (
    <div
      className="absolute inset-0 text-paper"
      style={{ "--gp-top": "130px", "--gp-bottom": "110px", "--gp-side": "40px" } as React.CSSProperties}
    >
      <header className="absolute inset-x-0 top-0 h-[var(--gp-top)] bg-ink/95">
        <div className="grid h-full grid-cols-[1fr_520px_1fr] items-center gap-6 px-[var(--gp-side)]">
          {[0, 1].map((i) => {
            const side = i as 0 | 1;
            const team = feed.teams[side];
            return (
              <div key={side} className={cn("flex min-w-0 flex-col gap-2", side === 1 && "col-start-3 items-end")}>
                <div className={cn("flex min-w-0 items-center gap-4", side === 1 && "flex-row-reverse")}>
                  <span className="inline-flex -skew-x-12 items-center px-4 py-1.5" style={{ background: TEAM[side].c, boxShadow: `5px 5px 0 0 ${TEAM[side].deep}` }}>
                    <span className={cn("flex skew-x-12 items-center gap-3", side === 1 && "flex-row-reverse")}>
                      {team.image.trim() && <Img src={team.image} className="size-[34px] object-cover" />}
                      <span className="max-w-[420px] truncate font-display text-[28px] font-black leading-none text-white">{team.name}</span>
                    </span>
                  </span>
                  <Points score={feed.match.score[side]} firstTo={feed.match.firstTo} side={side} />
                </div>
                {live && (
                  <div className={cn("flex min-w-0 flex-wrap gap-x-7 gap-y-0.5", side === 1 && "justify-end")}>
                    {live.clients
                      .filter((c) => c.team === (side === 0 ? "left" : "right"))
                      .map((c) => (
                        <Player key={`${c.ipcId}:${c.userId}`} c={c} side={side} reduced={reduced} />
                      ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="col-start-2 row-start-1 flex flex-col items-center gap-2">
            {live ? (
              <>
                <div className="flex w-full items-center justify-between gap-3">
                  {[0, 1].map((i) => (
                    <span key={i} className={cn("num font-display text-[36px] font-black leading-none", i === 1 && "text-right")} style={{ color: (i === 0 ? diff > 0 : diff < 0) ? TEAM[i].hi : "var(--color-paper)" }}>
                      <Count value={live.totals[i]} reduced={reduced} />
                    </span>
                  ))}
                </div>
                <div className="relative h-[10px] w-full -skew-x-12 overflow-hidden bg-azure">
                  <span className="absolute inset-y-0 left-0 bg-rose transition-[width] duration-150" style={{ width: `${share * 100}%` }} />
                  <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-ink" />
                </div>
                <span className="num text-[18px] font-black" style={{ color: diff > 0 ? TEAM[0].hi : diff < 0 ? TEAM[1].hi : "var(--color-ash)" }}>
                  <Count value={Math.abs(diff)} reduced={reduced} />
                </span>
              </>
            ) : (
              <>
                <Lockup num={editionNum(feed)} size={34} />
                <span className="text-[14px] font-black uppercase tracking-[0.2em] text-ash">
                  {feed.match.round} · First to {feed.match.firstTo}
                </span>
              </>
            )}
          </div>
        </div>
        <FlagBar className="absolute inset-x-0 bottom-0 h-[4px]" />
      </header>

      <footer className="absolute inset-x-0 bottom-0 h-[var(--gp-bottom)] bg-ink/95">
        <FlagBar className="absolute inset-x-0 top-0 h-[4px]" />
        <div className="flex h-full items-center gap-7 px-[var(--gp-side)]">
          {current ? (
            <>
              <span className="inline-flex -skew-x-12 px-5 py-2" style={{ background: mod?.color ?? "var(--color-paper)", boxShadow: "5px 5px 0 0 rgba(0,0,0,0.6)" }}>
                <span className="skew-x-12 font-display text-[40px] font-black italic leading-none text-ink">{current.slot}</span>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[28px] font-black leading-tight">{current.title}</h3>
                <p className="truncate text-[18px] font-bold text-ash">
                  [{current.version}] · {current.creator}
                </p>
              </div>
              <dl className="flex shrink-0 items-center gap-3">
                {[
                  ["★", current.sr.toFixed(2)],
                  ["BPM", integer.format(current.bpm)],
                  ["CS", current.cs.toFixed(1)],
                  ["AR", current.ar.toFixed(1)],
                  ["OD", current.od.toFixed(1)],
                  ["Length", len(current.length)],
                ].map(([k, v]) => (
                  <div key={k} className="inline-flex -skew-x-12 border border-line bg-coal px-3 py-1.5">
                    <div className="flex skew-x-12 items-baseline gap-2">
                      <dt className={cn("text-[13px] font-black uppercase tracking-[0.12em]", k === "★" ? "text-gold" : "text-ash")}>{k}</dt>
                      <dd className="num text-[20px] font-black">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <span className="text-[18px] font-black uppercase tracking-[0.2em] text-ash">{feed.match.round}</span>
          )}
          <Lockup num={editionNum(feed)} size={26} className="ml-auto shrink-0 pl-4" />
        </div>
      </footer>
    </div>
  );
}
