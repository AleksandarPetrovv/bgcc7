"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import type { DrawPlayer } from "@/lib/draw";
import { useDict } from "@/components/site/lang";
import { useFormat } from "@/components/site/tournament";
import { roundName } from "@/lib/i18n/dict";
import { matchLabel } from "@/lib/matches";
import { Pfp } from "@/components/site/pfp";
import { Wordmark } from "@/components/site/graphics";
import { Letters } from "@/components/site/rich";
import { cn } from "@/lib/utils";

type Team = { a: DrawPlayer; b: DrawPlayer };
type Side = "l" | "r";

const at = (i: number, d: number, s = 0.08) => ({ "--i": i, "--d": `${d}s`, "--s": `${s}s` }) as React.CSSProperties;
// gap between rounds; the connector lines live in it
const GAP = "2.4cqw";

/**
 * the winners bracket from the round of 16 on, both halves facing the final in the middle. teams fill their round of 16
 * slot in match order as the host reveals them (`shown`). viewers get it full screen, admin as a small view in the page
 */
export function DrawBracket({ teams, r1, shown, cover }: { teams: Team[]; r1: [number, number][]; shown: number; cover?: boolean }) {
  const t = useDict();
  const f = useFormat();
  const rn = (r: string) => roundName(t, f.rounds[r]?.name ?? r);
  // slots filled before this view opened play with the intro, later ones the moment they are revealed
  const [firstShown] = useState(shown);
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const half = r1.length / 2;
  const slot = (k: number, j: 0 | 1) => (2 * k + j < shown ? teams[r1[k][j]] : null);
  const delayOf = (k: number, j: 0 | 1, intro: number) => (2 * k + j < firstShown ? intro + 0.25 : 0.05);

  // the overlay bracket's match box: a header strip with the match, then its two sides (round of 16: the drawn teams, later rounds: one empty row per side)
  // later rounds are dimmed with a filter, not opacity: the intro animation owns opacity and ends at 1
  const card = (id: string, k: number | null, side: Side | null, i: number, base: number, final = false) => (
    <div className={cn("flex w-full flex-col overflow-hidden border bg-coal", final ? "border-gold/70" : "border-line", k === null && "[filter:opacity(0.55)]", side === "l" ? "in-left" : side === "r" ? "in-right" : "in-pop")} style={at(i, base)}>
      <div className="flex h-[1.9cqw] shrink-0 items-center border-b border-line bg-ink/70 px-[0.8cqw]">
        <span className={cn("truncate text-[0.82cqw] leading-none", final ? "font-display font-bold text-gold-hi" : "num text-paper/75")}>{matchLabel(f, t, id, k === null)}</span>
      </div>
      {[1, 2].map((slotNo) => {
        const j = (slotNo - 1) as 0 | 1;
        const team = k === null ? null : slot(k, j);
        return (
          <div key={slotNo}>
            {slotNo === 2 &&
              (k === null ? (
                <div className="h-px bg-line" />
              ) : (
                <div className="relative flex h-px items-center justify-center bg-line">
                  <span className="bg-coal px-[0.5cqw] text-[0.62cqw] font-display font-black leading-none text-ash">{t.common.vs}</span>
                </div>
              ))}
            <div className="px-[0.8cqw] py-[0.45cqw]">{team ? <TeamRows key={team.a.id} team={team} side={side ?? "l"} d={delayOf(k!, j, base + i * 0.08)} /> : <EmptyRows n={k === null ? 1 : 2} />}</div>
          </div>
        );
      })}
    </div>
  );
  const ids = { qf: (n: number) => `winners-quarterfinals-${n}`, sf: (n: number) => `winners-semifinals-${n}` };

  const column = (round: "r16" | "qf" | "sf", side: Side, base: number) => {
    const n = round === "r16" ? half : round === "qf" ? half / 2 : 1;
    const first = side === "l" ? 0 : half;
    return (
      <div className="flex flex-col">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="relative flex flex-1 items-center py-[0.5cqw]" style={round === "r16" ? undefined : side === "l" ? { paddingLeft: GAP } : { paddingRight: GAP }}>
            {round !== "r16" && <Feeders side={side} d={base} />}
            {round === "r16" ? card(f.order[first + i], first + i, side, i, base) : card(ids[round](round === "qf" ? (side === "l" ? 1 : 3) + i : side === "l" ? 1 : 2), null, side, i, base)}
          </div>
        ))}
      </div>
    );
  };

  const board = (
    <div className="@container w-full">
      <div className="grid w-full grid-cols-[1.35fr_1.15fr_1.15fr_1.15fr_1.15fr_1.15fr_1.35fr]">
        {column("r16", "l", 0.35)}
        {column("qf", "l", 0.65)}
        {column("sf", "l", 0.85)}
        <div className="relative flex items-center" style={{ paddingInline: GAP }}>
          <span className="in-up absolute left-0 top-1/2 border-t border-line" style={{ width: GAP, ...at(0, 1) }} aria-hidden />
          <span className="in-up absolute right-0 top-1/2 border-t border-line" style={{ width: GAP, ...at(0, 1) }} aria-hidden />
          {card("winners-final", null, null, 0, 1.05, true)}
        </div>
        {column("sf", "r", 0.85)}
        {column("qf", "r", 0.65)}
        {column("r16", "r", 0.35)}
      </div>
    </div>
  );

  const head = (
    <header className={cn("flex flex-col items-center text-center", cover ? "mb-[2.5vh]" : "mb-5")}>
      {cover && (
        <span className="in-drop" style={at(0, 0.05)}>
          <Wordmark size="md" className="text-paper" />
        </span>
      )}
      <h2 className={cn("in-slam heading-slam", cover ? "mt-2 text-5xl" : "text-3xl")} style={at(0, 0.12)}>
        {t.schedule.upper}
      </h2>
      <p className="in-up mt-1.5 text-sm font-display font-bold text-ash" style={at(0, 0.25)}>
        {rn("winners-round-of-16")}
      </p>
    </header>
  );

  if (!cover)
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
        {head}
        {board}
      </motion.div>
    );
  if (!client) return null;
  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-[3vw] py-[3vh]"
      // inline: the lite rule that makes full-screen covers see-through would beat a class
      style={{ backgroundColor: "var(--ink)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,color-mix(in_srgb,var(--gold)_12%,transparent),transparent)]" aria-hidden />
      <div className="relative flex w-full max-w-[min(100%,calc((100dvh-14rem)*2))] flex-col">
        {head}
        {board}
      </div>
    </motion.div>,
    document.body,
  );
}

/** the bracket lines from the two matches feeding this one: a half box from both, then one line in */
function Feeders({ side, d }: { side: Side; d: number }) {
  const l = side === "l";
  return (
    <span className={cn("absolute inset-y-1/4", l ? "left-0" : "right-0", l ? "in-left" : "in-right")} style={{ width: GAP, ...at(0, d) }} aria-hidden>
      <span className={cn("absolute inset-y-0 w-1/2 border-y border-line", l ? "left-0 border-r" : "right-0 border-l")} />
      <span className={cn("absolute top-1/2 w-1/2 border-t border-line", l ? "right-0" : "left-0")} />
    </span>
  );
}

function TeamRows({ team, side, d }: { team: Team; side: Side; d: number }) {
  return (
    <div className={side === "l" ? "in-left" : "in-right"} style={at(0, d)}>
      {[team.a, team.b].map((p, i) => (
        <div key={p.id} className="flex h-[1.95cqw] min-w-0 items-center gap-[0.6cqw]">
          <Pfp src={p.avatar} className="size-[1.65cqw] shrink-0 shadow-[0_0_0_1px_var(--line)]" />
          <Letters text={p.name} plain d={d + 0.15 + i * 0.12} s={0.025} className={cn("min-w-0 truncate text-[1.05cqw] font-semibold leading-none", i === 0 ? "text-paper" : "text-ash")} />
        </div>
      ))}
    </div>
  );
}

function EmptyRows({ n }: { n: number }) {
  return (
    <div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex h-[1.95cqw] items-center gap-[0.6cqw] opacity-60">
          <span className="size-[1.65cqw] shrink-0 rounded-full border border-dashed border-line" />
          <span className="h-[0.45cqw] w-2/5 rounded-full bg-line/60" />
        </div>
      ))}
    </div>
  );
}
