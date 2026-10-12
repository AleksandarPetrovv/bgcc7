"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MODS } from "@/lib/data";
import type { LiveClient, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { editionNum, FlagBar, Img, LABEL, Lockup, TEAM } from "./chrome";

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
        <span key={i} className="relative size-[19px] rotate-45 border-[3px]" style={{ borderColor: TEAM[side].c }}>
          {i < score && (
            <motion.span
              className="absolute inset-0"
              style={{ background: TEAM[side].c }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
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

// matches osu!tourney's own 2v2 layout at tournament.cfg Height = 1080: four 480x360 clients in a
// 2x2 block, team 1 on the left. one display/window capture of the manager area lines up 1:1.
const TOP = 170;
const CW = 480;
const CH = 360;
const LEFT = 480;
const BOTTOM = TOP + 2 * CH;
const BOXES = [
  { x: LEFT, y: TOP, side: 0, n: 1 },
  { x: LEFT, y: TOP + CH, side: 0, n: 2 },
  { x: LEFT + CW, y: TOP, side: 1, n: 1 },
  { x: LEFT + CW, y: TOP + CH, side: 1, n: 2 },
] as const;

function GameplayDivider({ length, horizontal = false }: { length: number; horizontal?: boolean }) {
  return (
    <span
      className="pointer-events-none absolute w-[8px]"
      style={{ left: LEFT + CW, top: TOP + CH, height: length, transform: `translate(-50%, -50%)${horizontal ? " rotate(90deg)" : ""}` }}
      aria-hidden
    >
      <span className="absolute inset-y-0 left-0 w-[2px] bg-azure" />
      <span className="absolute inset-y-0 right-0 w-[2px] bg-rose" />
      <span className="absolute inset-y-0 left-[2px] w-[4px] bg-gold-hi" style={{ boxShadow: "0 0 14px var(--color-gold)" }} />
    </span>
  );
}

function Player({ c, p, side, reduced }: { c?: LiveClient; p?: OverlayFeed["teams"][number]["players"][number]; side: 0 | 1; reduced: boolean }) {
  const t = TEAM[side];
  const right = side === 1;
  return (
    <div className={cn("flex h-full flex-col justify-center gap-4 px-9 transition-opacity duration-300", right ? "items-start" : "items-end text-right", c?.failed && "opacity-45")}>
      <div className={cn("flex min-w-0 max-w-full items-center gap-4", !right && "flex-row-reverse")}>
        {p?.avatar && (
          <span className="inline-flex shrink-0 -skew-x-12 overflow-hidden border-[3px] bg-ink" style={{ borderColor: t.c, boxShadow: `6px 6px 0 0 ${t.deep}` }}>
            <Img src={p.avatar} className="size-[84px] shrink-0 skew-x-12 scale-[1.25] object-cover" />
          </span>
        )}
        <div className={cn("flex min-w-0 flex-col", !right && "items-end")}>
          <span className="max-w-[280px] truncate font-display text-[32px] font-black leading-tight">{c?.name ?? p?.name ?? ""}</span>
          <span className="num text-[18px] font-black" style={{ color: t.hi }}>
            {p?.rank ? `#${p.rank.toLocaleString("en-US")}` : ""}
          </span>
        </div>
      </div>
      {c && (
        <>
          <span className="num font-display text-[54px] font-black leading-none" style={{ color: t.hi }}>
            <Count value={c.score} reduced={reduced} />
          </span>
          <div className="flex gap-3">
            {[
              [<Count key="a" value={c.accuracy} decimals reduced={reduced} />, "%"],
              [<Count key="c" value={c.combo} reduced={reduced} />, "x"],
            ].map(([v, unit], i) => (
              <span key={i} className="inline-flex -skew-x-12 border border-line bg-coal px-3 py-1">
                <span className="num skew-x-12 text-[22px] font-black">
                  {v}
                  <span className="text-ash">{unit}</span>
                </span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const len = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s)) % 60).padStart(2, "0")}`;

export function GameplayScene({ feed }: { feed: OverlayFeed }) {
  const reduced = useReducedMotion() !== false;
  const { live, current } = feed;
  const total = live ? live.totals[0] + live.totals[1] : 0;
  const diff = live ? live.totals[0] - live.totals[1] : 0;
  const lead = Math.max(-1, Math.min(1, diff / 300_000));
  const share = total > 0 ? 0.5 + 0.48 * Math.sign(lead) * Math.abs(lead) ** 0.6 : 0.5;
  const mod = current ? Object.values(MODS).find((m) => current.slot.toUpperCase().startsWith(m.short)) : undefined;
  const [setup, setSetup] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSetup(new URLSearchParams(window.location.search).has("setup")), 0);
    return () => window.clearTimeout(id);
  }, []);
  const clients = (side: 0 | 1) => (live?.clients ?? []).filter((c) => c.team === (side === 0 ? "left" : "right")).sort((a, b) => a.ipcId - b.ipcId);
  const holes = BOXES.map((b) => `M${b.x} ${b.y}h${CW}v${CH}h-${CW}Z`).join("");
  const playerOf = (side: 0 | 1, row: number) => {
    const c = clients(side)[row];
    const players = feed.teams[side].players;
    return { c, p: (c && players.find((x) => x.id === c.userId)) ?? players[row] };
  };

  return (
    <div
      className="absolute inset-0 text-paper"
      style={{ "--gp-top": `${TOP}px`, "--gp-bottom": `${1080 - BOTTOM}px`, "--gp-side": "40px" } as React.CSSProperties}
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 1920 1080" aria-hidden>
        <path d={`M0 0H1920V1080H0Z${holes}`} fillRule="evenodd" className="fill-ink" />
      </svg>
      {[0, 1].map((side) => (
        <div
          key={side}
          className="pointer-events-none absolute"
          style={{ left: LEFT + side * CW, top: TOP, width: CW, height: 2 * CH, outline: `4px solid ${TEAM[side].c}` }}
          aria-hidden
        />
      ))}
      <GameplayDivider length={2 * CW} horizontal />
      <GameplayDivider length={2 * CH + 8} />
      {BOXES.map((b, i) => (
        <div key={i} className="absolute" style={{ left: b.x, top: b.y, width: CW, height: CH }}>
          {setup && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 font-display font-black" style={{ color: TEAM[b.side].hi }}>
              <span className="text-[48px] leading-none">{b.side === 0 ? "Red" : "Blue"} {b.n}</span>
              <span className="num text-[22px] text-paper/80">
                {b.x}, {b.y} · {CW}×{CH}
              </span>
            </span>
          )}
        </div>
      ))}
      {[0, 1].map((i) => {
        const side = i as 0 | 1;
        return (
          <div
            key={side}
            className="absolute"
            style={{ left: side ? LEFT + 2 * CW : 0, width: LEFT, top: TOP, height: 2 * CH, background: `linear-gradient(${side ? 270 : 90}deg, transparent, color-mix(in srgb, ${TEAM[side].c} 12%, transparent))` }}
          >
            {[0, 1].map((row) => (
              <div key={row} style={{ height: CH }}>
                <Player {...playerOf(side, row)} side={side} reduced={reduced} />
              </div>
            ))}
          </div>
        );
      })}
      <motion.header
        className="absolute inset-x-0 top-0 h-[var(--gp-top)] bg-ink/95"
        initial={{ y: "-100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="grid h-full grid-cols-[1fr_520px_1fr] items-center gap-6 px-[var(--gp-side)] pb-1">
          {[0, 1].map((i) => {
            const side = i as 0 | 1;
            const team = feed.teams[side];
            return (
              <div key={side} className={cn("flex min-w-0 flex-col", side === 1 && "col-start-3 items-end")}>
                <div className={cn("flex min-w-0 items-center gap-5", side === 1 && "flex-row-reverse")}>
                  <span className="inline-flex -skew-x-12 items-center px-4 py-1.5" style={{ background: TEAM[side].c, boxShadow: `5px 5px 0 0 ${TEAM[side].deep}` }}>
                    <span className={cn("flex skew-x-12 items-center gap-3", side === 1 && "flex-row-reverse")}>
                      {team.image.trim() && <Img src={team.image} className="size-[44px] object-cover" />}
                      <span className="max-w-[460px] truncate font-display text-[36px] font-black leading-none text-white">{team.name}</span>
                    </span>
                  </span>
                  <Points score={feed.match.score[side]} firstTo={feed.match.firstTo} side={side} />
                </div>
              </div>
            );
          })}
          <div className="col-start-2 row-start-1 flex flex-col items-center gap-2">
            {live ? (
              <>
                <div className="flex w-full items-center justify-between gap-3">
                  {[0, 1].map((i) => (
                    <span
                      key={i}
                      className={cn("num font-display text-[50px] font-black leading-none transition-[color,text-shadow] duration-300", i === 1 && "text-right")}
                      style={{ color: (i === 0 ? diff > 0 : diff < 0) ? TEAM[i].hi : "var(--color-paper)", textShadow: (i === 0 ? diff > 0 : diff < 0) ? `0 0 22px ${TEAM[i].c}` : "none" }}
                    >
                      <Count value={live.totals[i]} reduced={reduced} />
                    </span>
                  ))}
                </div>
                <div className="relative h-[16px] w-full -skew-x-12">
                  <div className="absolute inset-0 overflow-hidden bg-azure">
                    <span className="absolute inset-y-0 left-0 bg-rose transition-[width] duration-300 ease-out" style={{ width: `${share * 100}%` }} />
                    <span className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2 bg-ink" />
                  </div>
                  <span
                    className="absolute -inset-y-[7px] w-[6px] -translate-x-1/2 bg-gold-hi transition-[left] duration-300 ease-out"
                    style={{ left: `${share * 100}%`, boxShadow: "0 0 10px var(--color-gold), 0 0 22px var(--color-gold)" }}
                  />
                </div>
                <span className="num text-[22px] font-black" style={{ color: diff > 0 ? TEAM[0].hi : diff < 0 ? TEAM[1].hi : "var(--color-ash)" }}>
                  <Count value={Math.abs(diff)} reduced={reduced} />
                </span>
              </>
            ) : (
              <>
                <Lockup num={editionNum(feed)} size={34} />
                <span className={LABEL}>
                  {feed.match.round} · First to {feed.match.firstTo}
                </span>
              </>
            )}
          </div>
        </div>
        <FlagBar className="absolute inset-x-0 bottom-0 h-[4px]" />
      </motion.header>

      <motion.footer
        className="absolute inset-x-0 bottom-0 h-[var(--gp-bottom)] bg-ink/95"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <FlagBar className="absolute inset-x-0 top-0 h-[4px]" />
        <motion.div
          key={current?.id ?? "none"}
          className="flex h-full items-center gap-7 px-[var(--gp-side)]"
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {current ? (
            <>
              <span className="inline-flex -skew-x-12 px-5 py-2" style={{ background: mod?.color ?? "var(--color-paper)", boxShadow: "5px 5px 0 0 rgba(0,0,0,0.6)" }}>
                <span className="skew-x-12 font-display text-[54px] font-black italic leading-none text-ink">{current.slot}</span>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[38px] font-black leading-tight">{current.title}</h3>
                <p className="truncate text-[22px] font-bold text-ash">
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
                      <dt className={cn("text-[13px] font-black uppercase tracking-[0.05em]", k === "★" ? "text-gold" : "text-ash")}>{k}</dt>
                      <dd className="num text-[26px] font-black">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <span className="text-[18px] font-black uppercase tracking-[0.08em] text-ash">{feed.match.round}</span>
          )}
          <Lockup num={editionNum(feed)} size={34} className="ml-auto shrink-0 pl-4" />
        </motion.div>
      </motion.footer>
    </div>
  );
}
