"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Confetti } from "@/components/site/confetti";
import { FlipCountdown } from "@/components/site/flip-countdown";
import { Glyph } from "@/components/site/graphics";
import type { FeedTeam, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { Backdrop, Blend, Echo, editionNum, Lockup, PlayerCard, Rule, ScoreNum, TEAM, TeamPic, TeamPlate, TopBar, Versus } from "./chrome";
import { EASE } from "@/lib/ease";
import { ROLL_REVEAL_MS, ROLL_SPIN_MS } from "@/lib/draft";


function Matchup({ feed, score }: { feed: OverlayFeed; score?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-12">
      <motion.div initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.25, ease: EASE }} className="flex min-w-0 justify-end">
        <TeamPlate team={feed.teams[0]} side={0} big />
      </motion.div>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.4, ease: EASE }}>
        {score ? (
          <span className="num flex shrink-0 items-center gap-5 text-[72px] italic leading-none">
            <ScoreNum value={feed.match.score[0]} side={0} style={{ color: TEAM[0].hi }} />
            <span className="text-ash">–</span>
            <ScoreNum value={feed.match.score[1]} side={1} style={{ color: TEAM[1].hi }} />
          </span>
        ) : (
          <Versus />
        )}
      </motion.div>
      <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.25, ease: EASE }} className="flex min-w-0 justify-start">
        <TeamPlate team={feed.teams[1]} side={1} big />
      </motion.div>
    </div>
  );
}

function Soon({ feed }: { feed: OverlayFeed }) {
  return (
    <>
      <motion.div className="absolute inset-x-0 top-[110px] flex justify-center" initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
        <Lockup num={editionNum(feed)} size={150} animate />
      </motion.div>
      <div className="absolute inset-x-0 bottom-[230px] top-[280px] flex items-center justify-center">
        <FlipCountdown key={`${feed.match.id}:${feed.match.startsAt}`} to={feed.match.startsAt ? Date.parse(feed.match.startsAt) : NaN} at={feed.at} />
      </div>
      <div className="absolute inset-x-[72px] bottom-[110px] flex flex-col gap-12">
        <Rule />
        <Matchup feed={feed} />
      </div>
    </>
  );
}

function useSpin(value: number | null) {
  const seen = useRef(value);
  const [shown, setShown] = useState<number | null>(value);
  const [spinning, setSpinning] = useState(false);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (value == null) setShown(null);
  }
  useEffect(() => {
    if (value === seen.current) return;
    seen.current = value;
    if (value == null) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ROLL_SPIN_MS);
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
  const [prev, setPrev] = useState(both);
  if (both !== prev) {
    setPrev(both);
    if (!both) setReady(false);
  }
  useEffect(() => {
    if (both === was.current) return;
    was.current = both;
    if (!both) return;
    const id = setTimeout(() => setReady(true), ROLL_REVEAL_MS);
    return () => clearTimeout(id);
  }, [both]);
  return ready;
}

function Roll({ value, state }: { value: number | null; state: "wait" | "won" | "lost" }) {
  const { shown, spinning } = useSpin(value);
  const won = state === "won" && !spinning;
  return (
    <div className={cn("flex flex-col items-center gap-2 transition-opacity duration-500", state === "lost" && !spinning && "opacity-45")}>
      <span className={cn("text-[16px] font-display font-bold transition-colors duration-500", won ? "text-gold-hi" : "text-ash")}>Roll</span>
      <span className="relative flex h-[84px] min-w-[150px] items-center justify-center border-b-4 transition-colors duration-500" style={{ borderColor: won ? "var(--gold)" : "var(--line)" }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={spinning ? "s" : `f${shown}`}
            className={cn("num text-[68px] italic leading-none", shown == null ? "text-ash/50" : won ? "text-gold-hi" : spinning ? "text-paper/70" : "text-paper")}
            initial={spinning ? { opacity: 0 } : { scale: 1.4, opacity: 0 }}
            animate={shown == null ? { scale: 1, opacity: [0.35, 0.8, 0.35] } : { scale: 1, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={shown == null ? { opacity: { duration: 1.6, repeat: Infinity } } : spinning ? { duration: 0.08 } : { duration: 0.45, ease: EASE }}
          >
            {shown ?? "?"}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}

function TeamSide({ team, side, roll }: { team: FeedTeam; side: 0 | 1; roll?: React.ReactNode }) {
  const right = side === 1;
  return (
    <motion.section
      initial={{ opacity: 0, x: right ? 80 : -80 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: right ? 0.1 : 0 }}
      className={cn("relative flex min-w-0 flex-col items-center justify-center gap-12 px-10 text-center", right && "col-start-3")}
    >
      <div className="flex flex-col items-center gap-5">
        <TeamPic src={team.image} size={120} />
        <h2 className="line-clamp-2 max-w-[640px] font-display text-[60px] font-black leading-[0.95]">{team.name}</h2>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {team.players.map((p, i) => (
          <PlayerCard key={p.id} p={p} size={120} delay={0.45 + i * 0.08} />
        ))}
      </div>
      {roll}
    </motion.section>
  );
}

function Intro({ feed }: { feed: OverlayFeed }) {
  const [a, b] = feed.rolls ?? [null, null];
  const revealed = useReveal(a != null && b != null && a !== b);
  const state = (i: 0 | 1) => (!revealed || a == null || b == null ? "wait" : (i === 0 ? a > b : b > a) ? "won" : "lost");
  const roll = (i: 0 | 1) => (feed.rolls ? <Roll value={feed.rolls[i]} state={state(i)} /> : null);
  return (
    <>
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, ease: EASE }}>
        <Blend teams={feed.teams} />
      </motion.div>
      <TopBar feed={feed} />
      <motion.div
        className="absolute inset-x-[72px] bottom-[100px] top-[140px] grid grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] border-b border-line"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <TeamSide team={feed.teams[0]} side={0} roll={roll(0)} />
        <motion.div
          className="relative col-start-2 row-start-1 flex items-center justify-center"
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
        >
          <Versus size={130} />
        </motion.div>
        <TeamSide team={feed.teams[1]} side={1} roll={roll(1)} />
        <span className="absolute -bottom-[8px] left-1/2 size-3.5 -translate-x-1/2 rotate-45 bg-rose" aria-hidden />
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
        <div className="absolute inset-x-[72px] top-[300px] flex flex-col items-center gap-14">
          <Echo text="Match score" className="text-[110px]" />
          <Matchup feed={feed} score />
        </div>
      </>
    );
  }
  const side = (w - 1) as 0 | 1;
  const team = feed.teams[side];
  const [a, b] = feed.match.score;
  const rise = (delay: number) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } });
  return (
    <>
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, ease: EASE }}>
        <Blend teams={feed.teams} winner={w} />
      </motion.div>
      <TopBar feed={feed} />
      <Confetti duration={4500} />
      <div className="absolute inset-x-[72px] bottom-[60px] top-[120px] flex flex-col items-center justify-center text-center">
        <motion.div {...rise(0.2)} className="flex items-center gap-3 text-gold-hi">
          <Glyph kind="crown" className="size-[28px]" />
          <span className="text-[28px] font-display font-bold">Winner</span>
        </motion.div>
        <motion.div {...rise(0.35)} className="mt-7">
          <TeamPic src={team.image} size={150} />
        </motion.div>
        <motion.h1 {...rise(0.5)} className={cn("heading-slam mt-6 max-w-[1500px] text-balance pb-[0.08em] leading-[1.05]", team.name.length > 16 ? "text-[88px]" : "text-[112px]")}>
          {team.name}
        </motion.h1>
        <div className="mt-10 flex flex-wrap justify-center gap-12">
          {team.players.map((p, i) => (
            <PlayerCard key={p.id} p={p} size={104} delay={0.8 + i * 0.1} />
          ))}
        </div>
      <motion.div {...rise(1.1)} className="mt-16 flex w-[1480px] flex-col gap-9">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-12 font-display font-black">
          {[0, 1].map((i) => (
            <span key={i} className={cn("flex min-w-0 items-center gap-4 text-[34px] leading-none", i === 0 ? "justify-end" : "col-start-3 row-start-1 flex-row-reverse justify-end", w !== i + 1 && "text-ash")}>
              <span className="min-w-0 truncate">{feed.teams[i].name}</span>
              <span className="h-[30px] w-[5px] shrink-0" style={{ background: TEAM[i].c }} aria-hidden />
            </span>
          ))}
          <span className="num col-start-2 row-start-1 flex items-center gap-6 text-[110px] italic leading-none">
            <span style={{ color: w === 1 ? TEAM[0].hi : "var(--ash)" }}>{a}</span>
            <span className="text-ash">–</span>
            <span style={{ color: w === 2 ? TEAM[1].hi : "var(--ash)" }}>{b}</span>
          </span>
        </div>
        <Rule />
      </motion.div>
      </div>
    </>
  );
}

function Break({ feed }: { feed: OverlayFeed }) {
  return (
    <>
      <TopBar feed={feed} />
      <div className="absolute inset-x-0 top-[200px] flex flex-col items-center">
        <motion.div className="mt-10 flex flex-col items-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: EASE }}>
          <Echo text="Be right" className="text-[180px]" />
          <Echo text="back" className="text-[180px]" color="var(--rose)" />
        </motion.div>
      </div>
      <div className="absolute inset-x-[72px] bottom-[110px] flex flex-col gap-12">
        <Rule />
        <Matchup feed={feed} score />
      </div>
    </>
  );
}

/** "thanks for watching": the end of a match on stream, and of the team draw (/draw shows it in the overlay's stage) */
export function ThanksScene({ num }: { num: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={num} tint="var(--white)" />
      <div className="absolute inset-x-0 top-[200px] flex flex-col items-center">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: EASE }}>
          <Lockup num={num} size={190} animate />
        </motion.div>
        <motion.div className="mt-28 flex flex-col items-center" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: EASE }}>
          <Echo text="Thanks for watching!" className="text-[84px]" />
        </motion.div>
      </div>
    </div>
  );
}

export function CalmScene({ feed }: { feed: OverlayFeed }) {
  const s = feed.scene;
  if (s === "end") return <ThanksScene num={editionNum(feed)} />;
  if (s !== "soon" && s !== "intro" && s !== "winner" && s !== "brb") return null;
  const tint = s === "winner" && feed.match.winner ? TEAM[feed.match.winner - 1].c : s === "soon" ? "var(--white)" : "var(--rose)";
  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={editionNum(feed)} tint={tint} />
      {s === "soon" && <Soon feed={feed} />}
      {s === "intro" && <Intro feed={feed} />}
      {s === "winner" && <Winner feed={feed} />}
      {s === "brb" && <Break feed={feed} />}
    </div>
  );
}
