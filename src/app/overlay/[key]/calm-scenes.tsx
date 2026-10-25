"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkle, TriTick } from "@/components/site/graphics";
import type { FeedTeam, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { Backdrop, Echo, editionNum, Img, Lockup, TEAM, TeamPlate, TopBar, Versus } from "./chrome";

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
          {i > 0 && <span className="mt-[70px] size-4 rotate-45 bg-rose" aria-hidden />}
          <div className="flex flex-col items-center gap-3">
            <span className="inline-flex -skew-x-12 border border-line bg-coal/90 px-6 py-2 shadow-[8px_8px_0_0_rgba(0,0,0,0.55)]">
              <span className="num skew-x-12 font-display text-[132px] font-black leading-none tabular-nums text-paper">{String(p).padStart(2, "0")}</span>
            </span>
            <span className="text-[16px] font-black uppercase tracking-[0.24em] text-ash">{labels[i]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Matchup({ feed, score }: { feed: OverlayFeed; score?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-10">
      <TeamPlate team={feed.teams[0]} side={0} big className="max-w-[640px]" />
      {score ? (
        <span className="num flex shrink-0 items-center gap-5 font-display text-[64px] font-black">
          <span style={{ color: TEAM[0].hi }}>{feed.match.score[0]}</span>
          <span className="size-3 rotate-45 bg-ash" aria-hidden />
          <span style={{ color: TEAM[1].hi }}>{feed.match.score[1]}</span>
        </span>
      ) : (
        <Versus />
      )}
      <TeamPlate team={feed.teams[1]} side={1} big className="max-w-[640px]" />
    </div>
  );
}

function Soon({ feed }: { feed: OverlayFeed }) {
  return (
    <>
      <div className="absolute inset-x-0 top-[110px] flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
          <Lockup num={editionNum(feed)} size={150} />
        </motion.div>
        <div className="mt-12 flex items-center gap-4">
          <TriTick className="h-[22px] w-[42px]" />
          <span className="text-[26px] font-black uppercase tracking-[0.3em] text-balkan">Starting soon</span>
          <TriTick className="h-[22px] w-[42px]" />
        </div>
        <div className="mt-10">
          <Countdown key={`${feed.match.id}:${feed.match.startsAt}`} startsAt={feed.match.startsAt} at={feed.at} />
        </div>
      </div>
      <motion.div className="absolute inset-x-[110px] bottom-[120px]" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: EASE }}>
        <Matchup feed={feed} />
      </motion.div>
      <Sparkle className="left-[1390px] top-[110px] size-10 text-rose-hi" />
      <Sparkle className="left-[1450px] top-[190px] size-5 text-balkan" delay={0.8} />
      <Sparkle className="left-[470px] top-[230px] size-3 text-paper/60" delay={1.6} />
    </>
  );
}

function TeamSide({ team, side }: { team: FeedTeam; side: 0 | 1 }) {
  const c = TEAM[side];
  const right = side === 1;
  return (
    <motion.section
      initial={{ opacity: 0, x: right ? 160 : -160 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: right ? 0.12 : 0 }}
      className={cn("absolute top-[170px] bottom-[110px] w-[1010px]", right ? "right-[-70px]" : "left-[-70px]")}
    >
      <div
        className="absolute inset-0 -skew-x-12 border-y-[6px] bg-coal/90"
        style={{ borderColor: c.c, background: `linear-gradient(${right ? 270 : 90}deg, color-mix(in srgb, ${c.c} 28%, transparent), var(--color-coal) 65%)`, boxShadow: `12px 12px 0 0 rgba(0,0,0,0.5)` }}
      />
      <div className={cn("relative flex h-full flex-col justify-center gap-10 px-[170px]", right && "items-end text-right")}>
        <div className={cn("flex items-center gap-8", right && "flex-row-reverse")}>
          {team.image.trim() && (
            <span className="inline-flex -skew-x-12 border-2 bg-ink p-2" style={{ borderColor: c.c, boxShadow: `8px 8px 0 0 ${c.deep}` }}>
              <Img src={team.image} className="size-[150px] skew-x-12 object-cover" />
            </span>
          )}
          <div>
            <span className="text-[18px] font-black uppercase tracking-[0.24em]" style={{ color: c.hi }}>
              {right ? "Blue" : "Red"}
            </span>
            <h2 className="max-w-[560px] font-display text-[64px] font-black leading-[0.95]">{team.name}</h2>
          </div>
        </div>
        <div className={cn("flex flex-wrap gap-8", right && "justify-end")}>
          {team.players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.45 + i * 0.08 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="inline-flex -skew-x-12 overflow-hidden border-2 bg-ink" style={{ borderColor: c.c }}>
                <Img src={p.avatar} className="size-[120px] skew-x-12 scale-110 object-cover" />
              </span>
              <span className="max-w-[170px] truncate text-[24px] font-black">{p.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function Intro({ feed }: { feed: OverlayFeed }) {
  return (
    <>
      <TopBar feed={feed} />
      <TeamSide team={feed.teams[0]} side={0} />
      <TeamSide team={feed.teams[1]} side={1} />
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
        style={{ background: `linear-gradient(90deg, ${c.deep}, ${c.c})`, boxShadow: "16px 0 0 0 rgba(0,0,0,0.45)" }}
        initial={{ x: -1400 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
        aria-hidden
      />
      <TopBar feed={feed} />
      <div className="absolute left-[120px] top-[240px] flex flex-col gap-8">
        <div className="flex items-center gap-5">
          <TriTick className="h-[26px] w-[48px]" />
          <span className="text-[28px] font-black uppercase tracking-[0.3em] text-gold-hi">Winner</span>
        </div>
        <div className="flex items-center gap-10">
          {team.image.trim() && (
            <span className="inline-flex -skew-x-12 border-4 border-gold bg-ink p-2 shadow-[10px_10px_0_0_var(--color-gold-deep)]">
              <Img src={team.image} className="size-[190px] skew-x-12 object-cover" />
            </span>
          )}
          <h1 className="max-w-[760px] font-display text-[104px] font-black leading-[0.92] text-white">{team.name}</h1>
        </div>
        <div className="flex flex-wrap gap-4">
          {team.players.map((p) => (
            <span key={p.id} className="inline-flex -skew-x-12 items-center bg-ink/60 px-4 py-2">
              <span className="flex skew-x-12 items-center gap-3">
                <Img src={p.avatar} className="size-[40px] object-cover" />
                <span className="text-[22px] font-black">{p.name}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="absolute right-[140px] top-[330px] flex flex-col items-center gap-6">
        <span className="num flex items-center gap-8 font-display text-[190px] font-black leading-none">
          <span style={{ color: w === 1 ? "var(--color-gold)" : "var(--color-ash)" }}>{a}</span>
          <span className="size-6 rotate-45 bg-gold" aria-hidden />
          <span style={{ color: w === 2 ? "var(--color-gold)" : "var(--color-ash)" }}>{b}</span>
        </span>
        <span className="text-[22px] font-black uppercase tracking-[0.2em] text-ash">
          {feed.teams[0].name} · {feed.teams[1].name}
        </span>
      </div>
      <Sparkle className="right-[560px] top-[250px] size-12 text-gold-hi" />
      <Sparkle className="right-[180px] top-[640px] size-7 text-gold" delay={0.6} />
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
            <Lockup num={editionNum(feed)} size={190} />
          </motion.div>
        ) : null}
        <motion.div
          className={cn("flex flex-col items-center", end ? "mt-14" : "mt-10")}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        >
          {end ? (
            <Echo text="Thanks for watching" className="text-[84px]" />
          ) : (
            <>
              <Echo text="Be right" className="text-[180px]" />
              <Echo text="back" className="text-[180px]" color="var(--color-rose)" />
            </>
          )}
        </motion.div>
      </div>
      <div className="absolute inset-x-[110px] bottom-[120px]">
        {end && w ? (
          <div className="flex items-center justify-center gap-6">
            <span className="text-[24px] font-black uppercase tracking-[0.24em] text-gold-hi">Winner</span>
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
  const tint = s === "winner" && feed.match.winner ? TEAM[feed.match.winner - 1].c : s === "soon" || s === "end" ? "var(--color-balkan)" : "var(--color-rose)";
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
