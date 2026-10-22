"use client";

import { motion } from "motion/react";
import { Glyph } from "@/components/site/graphics";
import type { FeedMatch, OverlayFeed } from "@/lib/overlay-types";
import { TZ, tzLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Backdrop, Echo, editionNum, LABEL, TEAM, TopBar } from "./chrome";

const EASE = [0.16, 1, 0.3, 1] as const;
const day = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function Heading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4">
      <Glyph kind="play" className="size-[24px]" />
      <h2 className="text-[22px] font-black uppercase tracking-[0.05em] text-paper">{text}</h2>
    </div>
  );
}

function Row({ m, current, i }: { m: FeedMatch; current: boolean; i: number }) {
  const at = m.startsAt ? new Date(m.startsAt) : null;
  const done = m.winner !== null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + i * 0.06, ease: EASE }}
      className="flex h-[78px] -skew-x-12 items-stretch border bg-coal/95"
      style={{ borderColor: current ? "var(--gold)" : "var(--line)", boxShadow: current ? "6px 6px 0 0 var(--gold-deep)" : "5px 5px 0 0 color-mix(in srgb, var(--rose-deep) 42%, transparent)" }}
    >
      <div className={cn("flex w-[170px] shrink-0 flex-col items-center justify-center", done ? "bg-slate" : "bg-rose")}>
        <span className={cn("skew-x-12 text-[15px] font-black uppercase tracking-[0.05em]", done ? "text-ash" : "text-white/85")}>{at ? day.format(at) : "TBD"}</span>
        <span className={cn("num skew-x-12 font-display text-[26px] font-black leading-none", done ? "text-paper" : "text-white")}>{at ? time.format(at) : "--:--"}</span>
      </div>
      <div className="flex min-w-0 flex-1 skew-x-12 flex-col justify-center gap-1 px-6">
        <span className={LABEL}>{m.round}</span>
        <div className="flex min-w-0 items-center gap-4 text-[24px] font-black">
          {[0, 1].map((s) => {
            const lost = done && m.winner !== s + 1;
            return (
              <span key={s} className={cn("flex min-w-0 items-center gap-3", s === 1 && "flex-row-reverse", s === 0 ? "flex-1" : "flex-1 justify-start")}>
                <span className="h-6 w-1.5 shrink-0" style={{ background: TEAM[s].c }} />
                <span className={cn("min-w-0 truncate", lost && "text-paper/40")}>{m.teams[s]}</span>
                {done && (
                  <span className="num font-display" style={{ color: lost ? "var(--ash)" : TEAM[s].hi }}>
                    {m.score[s] ?? 0}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export function ScheduleScene({ feed }: { feed: OverlayFeed }) {
  const all = feed.schedule ?? [];
  const t = (m: FeedMatch) => (m.startsAt ? Date.parse(m.startsAt) : Infinity);
  const next = all.filter((m) => m.winner === null && m.teams.some((n) => n !== "TBD")).sort((a, b) => t(a) - t(b)).slice(0, 6);
  const done = all.filter((m) => m.winner !== null).sort((a, b) => t(b) - t(a)).slice(0, 6);
  const labels = [...new Set([...next, ...done].flatMap((m) => m.startsAt ? [tzLabel(new Date(m.startsAt))] : []))];
  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={editionNum(feed)} tint="var(--rose)" />
      <TopBar feed={feed} />
      <div className="absolute left-[72px] top-[150px] flex items-end gap-6">
        <Echo text="Schedule" className="text-[92px]" />
        <span className={cn(LABEL, "mb-3")}>{labels.length ? labels.join(" / ") : tzLabel(new Date())}</span>
      </div>
      <div className={cn("absolute inset-x-[72px] top-[300px] grid gap-14", done.length ? "grid-cols-2" : "grid-cols-1")}>
        <section className="flex min-w-0 flex-col gap-4">
          <Heading text="Up next" />
          {next.map((m, i) => (
            <Row key={m.id} m={m} i={i} current={m.id === feed.match.id} />
          ))}
        </section>
        {done.length > 0 && (
          <section className="flex min-w-0 flex-col gap-4">
            <Heading text="Results" />
            {done.map((m, i) => (
              <Row key={m.id} m={m} i={i + 2} current={m.id === feed.match.id} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function Mini({ m, current }: { m: FeedMatch; current: boolean }) {
  const done = m.winner !== null;
  return (
    <div
      className="w-full border bg-coal/95"
      style={{ borderColor: current ? "var(--gold)" : "var(--line)", boxShadow: current ? "0 0 0 2px color-mix(in srgb, var(--gold) 35%, transparent)" : "3px 3px 0 0 color-mix(in srgb, var(--rose-deep) 42%, transparent)" }}
    >
      {[0, 1].map((s) => {
        const won = done && m.winner === s + 1;
        const tbd = m.teams[s] === "TBD";
        return (
          <div key={s} className={cn("flex h-[22px] items-center gap-2 pr-2", s === 0 && "border-b border-line")}>
            <span className="h-full w-[4px] shrink-0" style={{ background: won ? TEAM[s].c : "transparent" }} />
            <span className={cn("min-w-0 flex-1 truncate text-[14px] font-black", tbd ? "text-ash/60" : done && !won ? "text-paper/45" : "text-paper")}>{m.teams[s]}</span>
            {done && <span className={cn("num text-[14px] font-black", won ? "text-gold-hi" : "text-ash")}>{m.score[s] ?? 0}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Lane({ title, rounds, feed, height }: { title: string; rounds: [string, FeedMatch[]][]; feed: OverlayFeed; height: number }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <span className={LABEL}>{title}</span>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))`, height }}>
        {rounds.map(([round, ms], ri) => (
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: ri * 0.07, ease: EASE }}
            className="flex min-w-0 flex-col"
          >
            <span className="mb-1.5 truncate text-[13px] font-black uppercase tracking-[0.05em] text-paper/70">{round}</span>
            <div className="flex flex-1 flex-col justify-around gap-1.5">
              {ms.map((m) => (
                <Mini key={m.id} m={m} current={m.id === feed.match.id} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const byRound = (ms: FeedMatch[]) => {
  const out = new Map<string, FeedMatch[]>();
  for (const m of ms) out.set(m.round, [...(out.get(m.round) ?? []), m]);
  return [...out.entries()];
};

export function BracketScene({ feed }: { feed: OverlayFeed }) {
  const all = feed.schedule ?? [];
  const winners = byRound(all.filter((m) => m.bracket === "winners"));
  const losers = byRound(all.filter((m) => m.bracket === "losers"));
  const grand = all.filter((m) => m.bracket === "grand");
  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={editionNum(feed)} tint="var(--white)" />
      <TopBar feed={feed} />
      <div className="absolute left-[72px] top-[130px]">
        <Echo text="Bracket" className="text-[64px]" />
      </div>
      <div className="absolute inset-x-[72px] bottom-[50px] top-[230px] grid grid-cols-[minmax(0,1fr)_250px] gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Lane title="Winners bracket" rounds={winners} feed={feed} height={430} />
          <Lane title="Losers bracket" rounds={losers} feed={feed} height={300} />
        </div>
        <section className="flex flex-col justify-center gap-3">
          <span className={cn(LABEL, "text-gold-hi")}>Grand finals</span>
          {grand.map((m) => (
            <Mini key={m.id} m={m} current={m.id === feed.match.id} />
          ))}
        </section>
      </div>
    </div>
  );
}
