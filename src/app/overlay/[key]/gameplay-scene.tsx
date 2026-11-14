"use client";

import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IPC_PLAYING } from "@/lib/relay-contract";
import { StreamChat } from "./stream-chat";
import { slotColor } from "@/lib/format-plan";
import { modOn } from "@/lib/theme";
import type { LiveClient, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { editionNum, HeaderSide, LABEL, Lockup, Slant, TEAM } from "./chrome";
import { Pfp } from "@/components/site/pfp";
import { EASE } from "@/lib/ease";

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Count = memo(function Count({ value, decimals = false, reduced, signed = false }: { value: number; decimals?: boolean; reduced: boolean; signed?: boolean }) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const lastAt = useRef(0);
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
    const span = Math.min(1000, Math.max(120, start - lastAt.current));
    lastAt.current = start;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / span);
      shown.current = from + (value - from) * p;
      el.textContent = format(shown.current);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, reduced, signed]);
  return <span ref={node}>{initial}</span>;
});

// four 4:3 tourney clients in a 2x2 block, team 1 on the left. "stream layout.ps1" sizes and places
// the client windows to match, so one display capture of the manager area lines up 1:1.
const TOP = 128;
const CW = 576;
const CH = 432;
const LEFT = (1920 - 2 * CW) / 2;
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
      <span className="absolute inset-y-0 left-0 w-[2px] bg-ink" />
      <span className="absolute inset-y-0 right-0 w-[2px] bg-ink" />
      <span className="absolute inset-y-0 left-[2px] w-[4px] bg-rose" style={{ boxShadow: "0 0 10px color-mix(in srgb, var(--rose) 55%, transparent)" }} />
    </span>
  );
}

function Player({ c, p, side, reduced }: { c?: LiveClient; p?: OverlayFeed["teams"][number]["players"][number]; side: 0 | 1; reduced: boolean }) {
  const t = TEAM[side];
  const right = side === 1;
  const [started, setStarted] = useState(false);
  if (!started && c && (c.score > 0 || c.combo > 0)) setStarted(true);
  const move = { duration: reduced ? 0 : 0.6, ease: EASE };
  return (
    <div className={cn("flex h-full flex-col items-center justify-center gap-4 text-center transition-opacity duration-300", right ? "pl-8 pr-4" : "pl-4 pr-8", c?.failed && "opacity-45")}>
      <motion.div layout="position" transition={move} className="flex min-w-0 max-w-full flex-col items-center gap-3">
        {p?.avatar && (
          <Pfp src={p.avatar} className="size-[82px]" />
        )}
        <div className="flex min-w-0 max-w-full flex-col items-center">
          <span className="max-w-[320px] truncate font-display text-[30px] font-black leading-tight">{c?.name ?? p?.name ?? ""}</span>
          <span className="num text-[18px] font-black" style={{ color: t.hi }}>
            {p?.rank ? `#${p.rank.toLocaleString("en-US")}` : ""}
          </span>
        </div>
      </motion.div>
      {c && started && (
        <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ ...move, delay: reduced ? 0 : 0.1 }}>
          <span className="num font-display text-[54px] font-black leading-none" style={{ color: t.hi }}>
            <Count value={c.score} reduced={reduced} />
          </span>
          <div className="flex gap-6">
            {[
              [<Count key="a" value={c.accuracy} decimals reduced={reduced} />, "%"],
              [<Count key="c" value={c.combo} reduced={reduced} />, "x"],
            ].map(([v, unit], i) => (
              <span key={i} className="num text-[24px] font-black">
                {v}
                <span className="text-ash">{unit}</span>
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

const still = () => () => {};
const len = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s)) % 60).padStart(2, "0")}`;

export function GameplayScene({ feed }: { feed: OverlayFeed }) {
  const reduced = useReducedMotion() !== false;
  const { live, current } = feed;
  const total = live ? live.totals[0] + live.totals[1] : 0;
  const diff = live ? live.totals[0] - live.totals[1] : 0;
  const lead = Math.max(-1, Math.min(1, diff / 300_000));
  const share = total > 0 ? 0.5 + 0.48 * Math.sign(lead) * Math.abs(lead) ** 0.6 : 0.5;
  // lobby chat sits in the footer only between maps: before one starts and on the results
  const talk = !!feed.chat?.length && live?.ipcState !== IPC_PLAYING;
  const slotC = current ?slotColor(current.slot.toUpperCase()) : "var(--paper)";
  const setup = useSyncExternalStore(still, () => new URLSearchParams(window.location.search).has("setup"), () => false);
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
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 font-display font-black text-white" style={{ background: `color-mix(in srgb, ${TEAM[b.side].deep} 70%, transparent)` }}>
              <span className="text-[48px] leading-none">{b.side === 0 ? "Red" : "Blue"} {b.n}</span>
              <span className="num text-[22px] text-white/85">
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
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="grid h-full grid-cols-[1fr_520px_1fr] items-center gap-6 px-[var(--gp-side)] pb-1">
          {[0, 1].map((i) => {
            const side = i as 0 | 1;
            return (
              <div key={side} className={cn("min-w-0", side === 1 && "col-start-3")}>
                <HeaderSide team={feed.teams[side]} side={side} score={feed.match.score[side]} firstTo={feed.match.firstTo} />
              </div>
            );
          })}
          <div className="col-start-2 row-start-1 flex flex-col items-center gap-1.5">
            {live ? (
              <>
                <div className="flex w-full items-center justify-between gap-3">
                  {[0, 1].map((i) => (
                    <span
                      key={i}
                      className={cn("num font-display text-[42px] font-black leading-none transition-colors duration-300", i === 1 && "text-right")}
                      style={{ color: (i === 0 ? diff > 0 : diff < 0) ? TEAM[i].hi : "var(--paper)" }}
                    >
                      <Count value={live.totals[i]} reduced={reduced} />
                    </span>
                  ))}
                </div>
                <div className="relative h-[16px] w-full -skew-x-12">
                  <div className="absolute inset-0 overflow-hidden bg-azure">
                    <span className="absolute inset-y-0 left-0 bg-crimson transition-[width] duration-300 ease-out" style={{ width: `${share * 100}%` }} />
                    <span className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2 bg-ink" />
                  </div>
                  <span
                    className="absolute -inset-y-[7px] w-[6px] -translate-x-1/2 bg-gold transition-[left] duration-300 ease-out"
                    style={{ left: `${share * 100}%`, boxShadow: "0 0 0 2px var(--paper)" }}
                  />
                </div>
                <span className="num text-[20px] font-black leading-none" style={{ color: diff > 0 ? TEAM[0].hi : diff < 0 ? TEAM[1].hi : "var(--ash)" }}>
                  <Count value={Math.abs(diff)} reduced={reduced} />
                </span>
              </>
            ) : (
              <>
                <Lockup num={editionNum(feed)} size={34} />
                <span className={LABEL}>{feed.match.round}</span>
              </>
            )}
          </div>
        </div>
      </motion.header>

      <motion.footer
        className="absolute inset-x-0 bottom-0 h-[var(--gp-bottom)] bg-ink/95"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
      >
        <div className="flex h-full items-center gap-6 px-[var(--gp-side)] pt-[4px]">
          <AnimatePresence>{talk && <StreamChat key="chat" lines={feed.chat ?? []} rows={3} size="compact" className="w-[820px] shrink-0" />}</AnimatePresence>
          <motion.div
            key={current?.id ?? "none"}
            layout="position"
            className={cn("flex min-w-0 flex-1 items-center", talk ? "gap-3" : "gap-4")}
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {current ? (
              <>
                <Slant className={talk ? "px-2 py-0.5" : "px-3 py-1"} style={{ background: slotC, boxShadow: "4px 4px 0 0 color-mix(in srgb, var(--rose-deep) 42%, transparent)" }}>
                  <span className={cn("font-display font-black italic leading-none", talk ? "text-[24px]" : "text-[34px]")} style={{ color: modOn(slotC) }}>{current.slot}</span>
                </Slant>
                <div className="min-w-0 flex-1">
                  <h3 className={cn("truncate font-black leading-tight", talk ? "text-[18px]" : "text-[24px]")}>{current.title}</h3>
                  <p className={cn("truncate font-bold text-ash", talk ? "text-[12px]" : "text-[14px]")}>
                    [{current.version}] · {current.creator}
                  </p>
                </div>
                <dl className={cn("flex shrink-0 items-baseline", talk ? "gap-3" : "gap-5")}>
                  {[
                    ["★", current.sr.toFixed(2)],
                    ["BPM", integer.format(current.bpm)],
                    ["CS", current.cs.toFixed(1)],
                    ["AR", current.ar.toFixed(1)],
                    ["OD", current.od.toFixed(1)],
                    ["Length", len(current.length)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline gap-1">
                      <dt className={cn("text-[11px] font-display font-bold", k === "★" ? "text-gold-hi" : "text-ash")}>{k}</dt>
                      <dd className={cn("num font-black", talk ? "text-[15px]" : "text-[18px]")}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <span className="text-[14px] font-display font-bold text-ash">{feed.match.round}</span>
            )}
            {/* mb lifts the wordmark ~3.5px so its letters (not the taller 7) centre on the stat numbers */}
            <Lockup num={editionNum(feed)} size={talk ? 18 : 22} className="mb-[7px] ml-auto shrink-0 pl-3" />
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}
