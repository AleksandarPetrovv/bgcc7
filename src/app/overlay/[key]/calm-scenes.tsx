"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Confetti } from "@/components/site/confetti";
import { Sparkle, Glyph } from "@/components/site/graphics";
import type { FeedTeam, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { Backdrop, Echo, editionNum, Img, LABEL, Lockup, PlayerCard, ScoreNum, SLAB, TEAM, TeamPlate, TopBar, Versus } from "./chrome";

const EASE = [0.16, 1, 0.3, 1] as const;

function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [active]);
  return now;
}

function Countdown({ startsAt, at }: { startsAt: string | null; at: number }) {
  const start = startsAt ? Date.parse(startsAt) : NaN;
  const now = useNow(Number.isFinite(start));
  const left = Math.ceil((start - Math.max(at, now ?? at)) / 1000);
  if (!Number.isFinite(left) || left <= 0) return <Echo text="Soon" className="text-[200px]" />;
  const parts = [Math.floor(left / 3600), Math.floor(left / 60) % 60, left % 60];
  const labels = ["Hours", "Minutes", "Seconds"];
  return (
    <div className="flex items-start gap-5" role="timer" aria-live="off">
      {parts.map((p, i) => (
        <div key={i} className="flex items-start gap-5">
          {i > 0 && <span className="mt-[80px] size-4 rotate-45 bg-rose" aria-hidden />}
          <div className="flex flex-col items-center gap-3">
            <span className="inline-flex -skew-x-12 overflow-hidden border border-line bg-coal/90 px-9 py-4 shadow-[8px_8px_0_0_color-mix(in_srgb,var(--rose-deep)_42%,transparent)]">
              <span className="num relative flex h-[136px] skew-x-12 items-center px-1 font-display text-[112px] font-black leading-none tabular-nums text-paper">
                {String(p)
                  .padStart(2, "0")
                  .split("")
                  .map((d, k) => (
                    <span key={k} className="relative inline-block">
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={d}
                          className="inline-block"
                          initial={{ y: "-100%", opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: "100%", opacity: 0 }}
                          transition={{ duration: 0.75, ease: [0.65, 0, 0.35, 1] }}
                        >
                          {d}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  ))}
              </span>
            </span>
            <span className={LABEL}>{labels[i]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Matchup({ feed, score }: { feed: OverlayFeed; score?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-10">
      <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.25, ease: EASE }} className="min-w-0">
        <TeamPlate team={feed.teams[0]} side={0} big className="max-w-[640px]" />
      </motion.div>
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.45 }}>
        {score ? (
          <span className="num flex shrink-0 items-center gap-5 font-display text-[64px] font-black">
            <ScoreNum value={feed.match.score[0]} side={0} style={{ color: TEAM[0].hi }} />
            <span className="size-3 rotate-45 bg-ash" aria-hidden />
            <ScoreNum value={feed.match.score[1]} side={1} style={{ color: TEAM[1].hi }} />
          </span>
        ) : (
          <Versus />
        )}
      </motion.div>
      <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.25, ease: EASE }} className="min-w-0">
        <TeamPlate team={feed.teams[1]} side={1} big className="max-w-[640px]" />
      </motion.div>
    </div>
  );
}

function Soon({ feed }: { feed: OverlayFeed }) {
  return (
    <>
      <div className="absolute inset-x-0 top-[110px] flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
          <Lockup num={editionNum(feed)} size={150} animate />
        </motion.div>
        <div className="mt-16">
          <Countdown key={`${feed.match.id}:${feed.match.startsAt}`} startsAt={feed.match.startsAt} at={feed.at} />
        </div>
      </div>
      <div className="absolute inset-x-[72px] bottom-[120px]">
        <Matchup feed={feed} />
      </div>
      {[
        { at: "left-[1390px] top-[110px]", s: "size-10 text-rose-hi", d: 0, r: [0, 18, 0], y: [0, -14, 0], x: [0, 6, 0], t: 4.2 },
        { at: "left-[1450px] top-[190px]", s: "size-5 text-balkan-hi", d: 0.8, r: [0, -24, 0], y: [0, 10, 0], x: [0, -8, 0], t: 3.4 },
        { at: "left-[470px] top-[230px]", s: "size-3 text-paper/60", d: 1.6, r: [0, 30, 0], y: [0, -8, 0], x: [0, 5, 0], t: 3.8 },
      ].map((f, i) => (
        <motion.div key={i} className={cn("pointer-events-none absolute", f.at)} animate={{ y: f.y, x: f.x, rotate: f.r }} transition={{ duration: f.t, repeat: Infinity, ease: "easeInOut", delay: f.d }}>
          <Sparkle className={cn("relative", f.s)} delay={f.d} />
        </motion.div>
      ))}
    </>
  );
}

// counts up to the roll over ~1.3s, winner revealed 1.6s after the second roll
function useSpin(value: number | null) {
  const seen = useRef(value);
  const [shown, setShown] = useState<number | null>(value);
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
    if (value === seen.current) return;
    seen.current = value;
    if (value == null) {
      const id = setTimeout(() => setShown(null), 0);
      return () => clearTimeout(id);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1300);
      if (p >= 1) {
        setShown(value);
        setSpinning(false);
        return;
      }
      setSpinning(true);
      setShown(Math.max(1, Math.round(value * (1 - (1 - p) ** 3))));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return { shown, spinning };
}

function useReveal(both: boolean) {
  const was = useRef(both);
  const [ready, setReady] = useState(both);
  useEffect(() => {
    if (both === was.current) return;
    was.current = both;
    const id = setTimeout(() => setReady(both), both ? 1600 : 0);
    return () => clearTimeout(id);
  }, [both]);
  return ready;
}

function Roll({ value, state, side }: { value: number | null; state: "wait" | "won" | "lost"; side: 0 | 1 }) {
  const c = TEAM[side];
  const { shown, spinning } = useSpin(value);
  const won = state === "won" && !spinning;
  return (
    <div className={cn("flex items-center gap-5 transition-opacity duration-500", side === 1 && "flex-row-reverse", state === "lost" && !spinning && "opacity-45")}>
      <span
        className="inline-flex -skew-x-12 items-center gap-4 border-[3px] px-6 py-2 transition-[border-color,box-shadow,background-color] duration-500"
        style={{ borderColor: won ? "var(--gold-deep)" : c.c, background: won ? "var(--gold)" : "color-mix(in srgb, var(--coal) 92%, transparent)", boxShadow: `7px 7px 0 0 ${won ? "var(--gold-deep)" : c.deep}` }}
      >
        <span className={cn("skew-x-12 text-[16px] font-display font-bold", won ? "text-paper/75" : "text-ash")}>Roll</span>
        <span className="relative flex h-[64px] min-w-[96px] skew-x-12 items-center justify-center">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={spinning ? "s" : `f${shown}`}
              className={cn("num font-display text-[56px] font-black leading-none", shown == null ? "text-ash/50" : spinning ? "text-paper/70" : "text-paper")}
              initial={spinning ? { opacity: 0 } : { scale: 2.2, opacity: 0, rotate: -8 }}
              animate={shown == null ? { y: 0, scale: 1, rotate: 0, opacity: [0.35, 0.8, 0.35] } : { y: 0, scale: 1, rotate: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={shown == null ? { opacity: { duration: 1.6, repeat: Infinity } } : spinning ? { duration: 0.08 } : { type: "spring", stiffness: 520, damping: 18 }}
            >
              {shown ?? "?"}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </div>
  );
}

function TeamSide({ team, side, roll }: { team: FeedTeam; side: 0 | 1; roll?: React.ReactNode }) {
  const c = TEAM[side];
  const right = side === 1;
  return (
    <motion.section
      initial={{ opacity: 0, x: right ? 160 : -160 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: right ? 0.12 : 0 }}
      className={cn("absolute top-[170px] bottom-[100px] w-[820px]", right ? "right-[110px]" : "left-[110px]")}
    >
      <div
        className="absolute inset-0 -skew-x-12 overflow-hidden border-y-[6px]"
        style={{
          borderColor: c.c,
          background: `radial-gradient(70% 55% at ${right ? "85%" : "15%"} 18%, color-mix(in srgb, ${c.c} 16%, transparent), transparent 70%), radial-gradient(60% 50% at ${right ? "20%" : "80%"} 92%, color-mix(in srgb, ${c.c} 9%, transparent), transparent 70%), var(--coal)`,
          boxShadow: `12px 12px 0 0 ${SLAB}`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(color-mix(in srgb, ${c.c} 22%, transparent) 1.6px, transparent 2.4px) 0 0 / 26px 26px`,
            maskImage: `linear-gradient(${right ? 225 : 135}deg, black, transparent 55%)`,
          }}
        />
      </div>
      {/* content shares the panel skew and each block unskews around its own center, so every row sits centered on its own slice of the trapezoid */}
      <div className="relative flex h-full -skew-x-12 flex-col items-center justify-center gap-14 px-[110px] text-center">
        <div className="flex flex-col items-center gap-5">
          {team.image.trim() && (
            <div className="skew-x-12">
              <span className="inline-flex shrink-0 -skew-x-12 overflow-hidden border-[3px] bg-ink" style={{ borderColor: c.c, boxShadow: `8px 8px 0 0 ${c.deep}` }}>
                <Img src={team.image} className="size-[110px] shrink-0 skew-x-12 scale-[1.25] object-cover" />
              </span>
            </div>
          )}
          <h2 className="max-w-[600px] skew-x-12 font-display text-[60px] font-black leading-[0.95]">{team.name}</h2>
        </div>
        <div className="flex skew-x-12 flex-wrap justify-center gap-10">
          {team.players.map((p, i) => (
            <PlayerCard key={p.id} p={p} color={c.c} deep={c.deep} size={140} delay={0.45 + i * 0.1} />
          ))}
        </div>
        {roll && <div className="skew-x-12">{roll}</div>}
      </div>
    </motion.section>
  );
}

function Intro({ feed }: { feed: OverlayFeed }) {
  const [a, b] = feed.rolls ?? [null, null];
  const revealed = useReveal(a != null && b != null && a !== b);
  const state = (i: 0 | 1) => (!revealed || a == null || b == null ? "wait" : (i === 0 ? a > b : b > a) ? "won" : "lost");
  const roll = (i: 0 | 1) => (feed.rolls ? <Roll value={feed.rolls[i]} state={state(i)} side={i} /> : null);
  return (
    <>
      <TopBar feed={feed} />
      <TeamSide team={feed.teams[0]} side={0} roll={roll(0)} />
      <TeamSide team={feed.teams[1]} side={1} roll={roll(1)} />
      <motion.div
        className="absolute left-1/2 top-[540px] z-10 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
      >
        <Versus size={150} />
      </motion.div>
    </>
  );
}

function Winner({ feed }: { feed: OverlayFeed }) {
  const w = feed.match.winner;
  if (!w) {
    return (
      <>
        <TopBar feed={feed} />
        <div className="absolute inset-x-0 top-[300px] flex flex-col items-center gap-10">
          <Echo text="Match score" className="text-[110px]" />
          <Matchup feed={feed} score />
        </div>
      </>
    );
  }
  const team = feed.teams[w - 1];
  const c = TEAM[w - 1];
  const [a, b] = feed.match.score;
  return (
    <>
      <motion.div
        className="absolute inset-y-[-40px] left-[-200px] w-[1350px] -skew-x-12"
        style={{ background: `linear-gradient(90deg, ${c.deep}, ${c.c})`, boxShadow: `16px 0 0 0 color-mix(in srgb, ${c.deep} 45%, transparent)` }}
        initial={{ x: -1400 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
        aria-hidden
      />
      <TopBar feed={feed} invert />
      <Confetti duration={4500} />
      <div className="absolute left-[72px] top-[200px] flex flex-col gap-8 text-white">
        <div className="flex items-center gap-5">
          <Glyph kind="crown" className="size-[30px]" />
          <span className="text-[28px] font-display font-bold text-gold">Winner</span>
        </div>
        <div className="flex items-center gap-10">
          {team.image.trim() && (
            <span className="inline-flex shrink-0 -skew-x-12 overflow-hidden border-4 border-gold bg-ink shadow-[10px_10px_0_0_var(--gold-deep)]">
              <Img src={team.image} className="size-[150px] shrink-0 skew-x-12 scale-[1.25] object-cover" />
            </span>
          )}
          <motion.h1
            className="max-w-[760px] font-display text-[92px] font-black leading-[0.92] text-white"
            initial={{ opacity: 0, x: -80, skewX: -12 }}
            animate={{ opacity: 1, x: 0, skewX: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
          >
            {team.name}
          </motion.h1>
        </div>
        <div className="flex flex-wrap gap-6">
          {team.players.map((p, i) => (
            <PlayerCard key={p.id} p={p} color="var(--gold)" deep="var(--gold-deep)" fg="var(--paper)" size={130} delay={1 + i * 0.12} />
          ))}
        </div>
      </div>
      <motion.div
        className="absolute right-[72px] top-[330px] flex w-[620px] flex-col items-center gap-6"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.8 }}
      >
        <span className="num flex items-center gap-8 font-display text-[190px] font-black leading-none">
          <span style={{ color: w === 1 ? c.hi : "var(--ash)" }}>{a}</span>
          <span className="size-6 rotate-45" style={{ background: c.c }} aria-hidden />
          <span style={{ color: w === 2 ? c.hi : "var(--ash)" }}>{b}</span>
        </span>
        <span className={LABEL}>
          {feed.teams[0].name} · {feed.teams[1].name}
        </span>
      </motion.div>
      <Sparkle className="right-[560px] top-[250px] size-12 text-rose" />
      <Sparkle className="right-[180px] top-[640px] size-7 text-balkan-hi" delay={0.6} />
      <Sparkle className="right-[700px] top-[700px] size-4 text-paper/70" delay={1.2} />
    </>
  );
}

function Break({ feed, end }: { feed: OverlayFeed; end?: boolean }) {
  const w = feed.match.winner;
  return (
    <>
      {!end && <TopBar feed={feed} />}
      <div className="absolute inset-x-0 top-[200px] flex flex-col items-center">
        {end ? (
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: EASE }}>
            <Lockup num={editionNum(feed)} size={190} animate />
          </motion.div>
        ) : null}
        <motion.div
          className={cn("flex flex-col items-center", end ? "mt-14" : "mt-10")}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        >
          {end ? (
            <Echo text="Thanks for watching!" className="text-[84px]" />
          ) : (
            <motion.div className="flex flex-col items-center" animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <Echo text="Be right" className="text-[180px]" />
              <motion.span animate={{ rotate: [0, -1.5, 0, 1.5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
                <Echo text="back" className="text-[180px]" color="var(--rose)" />
              </motion.span>
            </motion.div>
          )}
        </motion.div>
      </div>
      <div className="absolute inset-x-[72px] bottom-[120px]">
        {end && w ? (
          <div className="flex items-center justify-center gap-6">
            <span className="text-[22px] font-display font-bold text-gold-hi">Winner</span>
            <TeamPlate team={feed.teams[w - 1]} side={(w - 1) as 0 | 1} big />
          </div>
        ) : (
          <Matchup feed={feed} score />
        )}
      </div>
    </>
  );
}

export function CalmScene({ feed }: { feed: OverlayFeed }) {
  const s = feed.scene;
  if (s !== "soon" && s !== "intro" && s !== "winner" && s !== "brb" && s !== "end") return null;
  const tint = s === "winner" && feed.match.winner ? TEAM[feed.match.winner - 1].c : s === "soon" || s === "end" ? "var(--white)" : "var(--rose)";
  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={editionNum(feed)} tint={tint} />
      {s === "soon" && <Soon feed={feed} />}
      {s === "intro" && <Intro feed={feed} />}
      {s === "winner" && <Winner feed={feed} />}
      {s === "brb" && <Break feed={feed} />}
      {s === "end" && <Break feed={feed} end />}
    </div>
  );
}
