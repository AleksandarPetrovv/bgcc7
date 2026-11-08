"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ban, CircleHelp, Crown, Dices, Lock, Pause, Play, Redo2, RotateCcw, Swords, TimerOff, Undo2 } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { EASE } from "@/lib/ease";
import { plan, ROLL_SPIN_MS, type DraftStep, type DraftUndo, type DraftView, type Side, type Turn } from "@/lib/draft";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { GOLD, TEAM, tint } from "@/lib/theme";
import { holdDraft, redoDraft, resumeDraft, undoDraft } from "@/actions/draft";
import { Waiting } from "./draft-popups";

export type TeamInfo = {
  name: string;
  image: string;
};

function RollNumber({ value, side, win, lose }: { value: number | null; side: Side; win: boolean; lose: boolean }) {
  const seen = useRef(value);
  const [shown, setShown] = useState<number | null>(value);
  const [spinning, setSpinning] = useState(false);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (value == null) setShown(null);
    else {
      setSpinning(true);
      setShown(1 + ((value * 37 + (shown ?? 0)) % 100));
    }
  }
  useEffect(() => {
    if (value === seen.current) return;
    seen.current = value;
    if (value == null) return;
    let alive = true;
    let delay = 30 * 1.14;
    const start = performance.now();
    const tick = () => {
      if (!alive) return;
      if (performance.now() - start > ROLL_SPIN_MS) {
        setShown(value);
        setSpinning(false);
        return;
      }
      setShown(1 + Math.floor(Math.random() * 100));
      delay *= 1.14;
      timer = setTimeout(tick, delay);
    };
    let timer = setTimeout(tick, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [value]);

  const done = shown != null && !spinning;
  return (
    <div className="relative flex h-28 items-center justify-center sm:h-36">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={spinning ? `s${shown}` : `f${shown}`}
          initial={spinning ? { y: -30, opacity: 0 } : { scale: 2.2, opacity: 0, rotate: -8 }}
          animate={{
            y: 0,
            scale: 1,
            opacity: lose && done ? 0.35 : 1,
            rotate: 0,
          }}
          exit={spinning ? { y: 30, opacity: 0 } : { opacity: 0 }}
          transition={spinning ? { duration: 0.08 } : { type: "spring", stiffness: 520, damping: 18 }}
          className={cn("num text-7xl font-display font-black tabular-nums sm:text-8xl", shown == null ? "text-rose-hi" : spinning ? "text-paper/70 blur-[1px]" : TEAM[side].text)}
          style={done && win ? { textShadow: `0 0 36px ${TEAM[side].c}` } : undefined}
        >
          {shown ?? "?"}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence>
        {done && win && (
          <>
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute size-2 rotate-45"
                  style={{ background: i % 2 ? TEAM[side].hi : GOLD.c }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(a) * 110,
                    y: Math.sin(a) * 70,
                    opacity: 0,
                    scale: 0.3,
                  }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
                  aria-hidden
                />
              );
            })}
            <motion.span
              initial={{ y: 10, opacity: 0, rotate: -30, scale: 0.4 }}
              animate={{ y: 0, opacity: 1, rotate: -12, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 14,
                delay: 0.1,
              }}
              className="absolute -top-1 right-3 text-gold-hi sm:right-8"
              aria-hidden
            >
              <Crown className="size-9 fill-current" />
            </motion.span>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminBar({
  d,
  matchId,
  names,
  acting,
  onActing,
  pending,
  adminAct,
  onHelp,
  onReset,
}: {
  d: DraftView;
  matchId: string;
  names: [string, string];
  acting: Side;
  onActing: (s: Side) => void;
  pending: boolean;
  adminAct: (fn: () => Promise<unknown>) => void;
  onHelp: () => void;
  onReset: () => void;
}) {
  const t = useDict();
  const stepText = (u: DraftUndo) =>
    u.kind === "winner" ? t.draft.stepWin(u.slot) : u.kind === "step" ? (u.step.skip ? t.draft.stepSkip : t.draft.stepDo(u.step.kind, u.step.slot)) : u.kind === "choice" ? t.draft.stepChoice : t.draft.stepRolls;
  const btn = "group relative isolate inline-flex min-h-8 items-center gap-1.5 px-3 text-xs font-display font-bold disabled:opacity-50";
  const sk = (c: string) => <SlantBg className={cn("border", c)} />;
  const idle = "border-line group-hover:border-rose";
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 flex flex-wrap items-center justify-center gap-2 border border-dashed border-line bg-coal/80 px-3 py-2 text-xs font-display font-bold"
    >
      <div className="flex justify-center gap-1 max-sm:basis-full sm:flex-1 sm:justify-start">
        {([1, 2] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onActing(s)}
            aria-pressed={acting === s}
            className={cn(btn, acting === s ? "text-white" : "text-paper")}
          >
            {sk(acting === s ? "border-transparent" : idle)}
            {acting === s && (
              <motion.span layoutId="dr-acting" className="absolute -inset-px -z-10" transition={{ type: "spring", stiffness: 500, damping: 36 }}>
                <span className={cn("absolute inset-0 -skew-x-12", TEAM[s].bg)} />
              </motion.span>
            )}
            <span className="inline-block max-w-32 truncate">{names[s - 1]}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onHelp}
        className={cn(btn, "text-paper")}
      >
        {sk(idle)}
        <CircleHelp className="size-3.5" /> {t.lobby.help}
      </button>
      <button
        type="button"
        disabled={pending}
        aria-pressed={!!d.pausedAt}
        onClick={() => adminAct(() => (d.pausedAt ? resumeDraft(matchId) : holdDraft(matchId)))}
        className={cn(btn, d.pausedAt ? "text-white" : "text-paper")}
      >
        {sk(d.pausedAt ? "border-rose bg-rose" : idle)}
        {d.pausedAt ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5 fill-current" />}
        {d.pausedAt ? t.draft.unhold : t.draft.hold}
      </button>
      <span className="flex justify-center gap-2 max-sm:basis-full sm:flex-1 sm:justify-end">
        {([
          ["undo", d.undo, Undo2, () => undoDraft(matchId)],
          ["redo", d.redo, Redo2, () => redoDraft(matchId)],
        ] as const).map(([k, u, Icon, fn]) => (
          <button
            key={k}
            type="button"
            disabled={pending || !u}
            onClick={() => adminAct(fn)}
            className={cn(btn, "text-paper")}
          >
            {sk(idle)}
            <Icon className="size-3.5" /> {k === "undo" ? t.draft.undo : t.draft.redo}
            {u && <span className="normal-case text-ash">· {stepText(u)}</span>}
          </button>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={onReset}
          className={cn(btn, "text-rose-hi")}
        >
          {sk("border-rose group-hover:bg-rose/10")}
          <RotateCcw className="size-3.5" /> {t.draft.reset}
        </button>
      </span>
      {!d.open && (
        <span className="flex w-full items-center gap-1.5 text-rose-hi">
          <Lock className="size-3.5" /> {t.draft.closed}
        </span>
      )}
    </motion.div>
  );
}

export function TeamsHeader({ teams, turn, me, score }: { teams: [TeamInfo, TeamInfo]; turn: Turn; me: Side | null; score: number[] | null }) {
  const t = useDict();
  const side = (s: Side) => {
    const on = "team" in turn && turn.team === s;
    const idle = "team" in turn && !on;
    const tm = teams[s - 1];
    return (
      <motion.div
        initial={{ opacity: 0, x: s === 1 ? -60 : 60 }}
        animate={{ opacity: idle ? 0.55 : 1, x: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.05, opacity: { duration: 0.5 } }}
        className={cn("flex min-w-0 flex-col items-center gap-2.5 text-center sm:flex-row sm:gap-5 sm:text-left", s === 2 && "sm:flex-row-reverse sm:text-right")}
      >
        {tm.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tm.image} alt="" className="size-12 shrink-0 -skew-x-6 border-2 object-cover sm:size-20" style={{ borderColor: TEAM[s].c, boxShadow: `5px 5px 0 0 ${TEAM[s].deep}` }} />
        ) : (
          <span className="size-12 shrink-0 -skew-x-6 border-2 bg-slate sm:size-20" style={{ borderColor: TEAM[s].c, boxShadow: `5px 5px 0 0 ${TEAM[s].deep}` }} />
        )}
        <div className={cn("flex w-full min-w-0 flex-1 flex-col items-center gap-2 sm:items-start", s === 2 && "sm:items-end")}>
          <div className="heading-slam w-full truncate text-base leading-none text-paper sm:text-3xl">{tm.name}</div>
          <div className={cn("flex w-full items-center gap-2", s === 2 && "flex-row-reverse")}>
            {me === s && (
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.7 }}
                className="relative isolate inline-flex shrink-0 items-center px-2 py-0.5 text-white"
              >
                <SlantBg style={{ background: TEAM[s].c }} />
                <span className="inline-flex items-center gap-1 text-[0.6rem] font-display font-bold sm:text-[0.65rem]">
                  <span className="anim-twinkle" aria-hidden>
                    ✦
                  </span>
                  {t.draft.you}
                </span>
              </motion.span>
            )}
            <span className={cn("dr-beads h-2 min-w-0 flex-1 transition-opacity duration-500", s === 2 && "dr-beads-l", on && "dr-beads-on")} style={{ color: on ? TEAM[s].hi : "var(--line)" }} aria-hidden />
          </div>
        </div>
      </motion.div>
    );
  };
  const num = (s: Side) =>
    score && (
      <AnimatePresence mode="popLayout">
        <motion.span
          key={score[s - 1]}
          initial={{ y: -30, opacity: 0, scale: 1.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className="num w-[1.2em] text-center text-4xl font-display font-black tabular-nums sm:text-6xl"
          style={{ color: TEAM[s].hi, textShadow: `0 0 28px ${tint(TEAM[s].c, 40)}` }}
        >
          {score[s - 1]}
        </motion.span>
      </AnimatePresence>
    );
  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 overflow-hidden border border-line bg-coal px-3 py-4 sm:gap-8 sm:px-6 sm:py-6">
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2" style={{ background: `radial-gradient(120% 160% at 0% 50%, ${tint(TEAM[1].c, 16)}, transparent 65%)` }} aria-hidden />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-1/2" style={{ background: `radial-gradient(120% 160% at 100% 50%, ${tint(TEAM[2].c, 16)}, transparent 65%)` }} aria-hidden />
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: TEAM[1].c }} aria-hidden />
      <span className="absolute inset-y-0 right-0 w-1" style={{ background: TEAM[2].c }} aria-hidden />
      {side(1)}
      <motion.div
        initial={{ scale: 3, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.45 }}
        className="relative flex items-center justify-center gap-2 sm:gap-4"
      >
        {num(1)}
        <span className={cn("heading-slam text-ash", score ? "text-lg sm:text-2xl" : "text-2xl sm:text-5xl")}>VS</span>
        {num(2)}
      </motion.div>
      {side(2)}
    </div>
  );
}

export function Rolls({
  d,
  turn,
  me,
  winner,
  hold,
  busy,
  paused,
  names,
  onRoll,
}: {
  d: DraftView;
  turn: Turn;
  me: Side | null;
  winner: Side | null;
  hold: boolean;
  busy: boolean;
  paused: boolean;
  names: [string, string];
  onRoll: () => void;
}) {
  const t = useDict();
  const show = turn.kind === "roll" || turn.kind === "tie" || turn.kind === "choose" || !d.choice;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.section
          key="rolls"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-2 gap-3 pt-6 sm:gap-6">
            {([1, 2] as const).map((s) => {
              const val = s === 1 ? d.roll1 : d.roll2;
              const canRoll = me === s && (turn.kind === "tie" || (turn.kind === "roll" && val == null));
              return (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, y: 30, rotate: s === 1 ? -3 : 3 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{
                    duration: 0.7,
                    ease: EASE,
                    delay: 0.2 + s * 0.1,
                  }}
                  className="relative flex flex-col items-center overflow-hidden border-2 bg-coal px-3 pb-4 pt-3"
                  style={{
                    borderColor: winner === s ? TEAM[s].c : "var(--line)",
                  }}
                >
                  <span
                    className="dr-glow pointer-events-none absolute inset-0 opacity-0"
                    style={{
                      background: canRoll ? `radial-gradient(circle at 50% 60%, ${tint(TEAM[s].c, 20)}, transparent 70%)` : undefined,
                    }}
                    aria-hidden
                  />
                  <span className={cn("relative max-w-full truncate text-xs font-display font-black", TEAM[s].text)}>{names[s - 1]}</span>
                  <RollNumber value={val} side={s} win={winner === s} lose={winner != null && winner !== s} />
                  <div className="relative flex h-11 items-center">
                    {canRoll ? (
                      <motion.button
                        type="button"
                        disabled={busy || paused}
                        onClick={onRoll}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.9, rotate: -6 }}
                        className="relative isolate inline-flex min-h-11 items-center gap-2 px-6 font-display font-bold text-white disabled:opacity-60"
                      >
                        <SlantBg style={{ background: TEAM[s].c }} />
                        <Dices className={cn("size-5", busy && "animate-spin")} /> {t.draft.roll}
                      </motion.button>
                    ) : (val == null && !hold) || turn.kind === "tie" ? (
                      <span className="inline-flex items-center gap-2 text-xs font-display font-bold text-ash">
                        {t.draft.waiting} <Waiting />
                      </span>
                    ) : winner === s ? (
                      <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-display font-bold text-gold-hi">
                        {t.draft.wins(names[s - 1])}
                      </motion.span>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

export function Sequence({ d, turn }: { d: DraftView; turn: Turn }) {
  const t = useDict();
  const picked = d.steps.filter((s) => s.kind === "pick" && !s.skip);
  const realBans = d.steps.filter((s) => s.kind === "ban" && !s.skip);
  const seq: { team: Side; kind: "ban" | "pick"; step?: DraftStep }[] = [
    ...plan(d).map((p, i) => ({ kind: p.kind, step: realBans[i], team: realBans[i]?.team ?? (turn.kind === "ban" && i === realBans.length ? turn.team : p.team) })),
    ...picked.map((s) => ({ team: s.team, kind: "pick" as const, step: s })),
    ...(turn.kind === "pick" ? [{ team: turn.team, kind: "pick" as const }] : []),
  ];
  const firstOpen = seq.findIndex((x) => !x.step);
  return (
    <section className="mt-6">
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <ol className="flex w-max items-stretch gap-1.5">
          {seq.map((x, i) => {
            const now = i === firstOpen && (turn.kind === "ban" || turn.kind === "pick");
            return (
              <motion.li
                key={i}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.4,
                  ease: EASE,
                  delay: Math.min(i, 10) * 0.04,
                }}
                className={cn(
                  "relative isolate flex w-16 shrink-0 flex-col items-center justify-center py-2 sm:w-20",
                )}
                title={x.step?.skip ? t.draft.skipped : undefined}
              >
                <SlantBg
                  className={cn("border-2", (!x.step || x.step.skip) && "border-dashed")}
                  style={{
                    borderColor: TEAM[x.team].c,
                    background: x.step ? (x.kind === "ban" || x.step.skip ? "var(--coal)" : TEAM[x.team].c) : now ? tint(TEAM[x.team].c, 13) : "transparent",
                  }}
                />
                {now && <SlantBg className="dr-glow inset-[2px]" style={{ background: tint(TEAM[x.team].c, 20) }} />}
                <span
                  className={cn(
                    "relative text-[0.6rem] font-display font-bold",
                    x.step && !x.step.skip && x.kind === "pick" ? "text-white/80" : TEAM[x.team].text,
                  )}
                >
                  {x.kind === "ban" ? <Ban className="inline size-3" /> : <Swords className="inline size-3" />}
                </span>
                <span
                  className={cn(
                    "num relative text-base font-display font-black leading-tight",
                    x.step?.skip ? "text-ash" : x.step ? (x.kind === "ban" ? "text-paper/60 line-through" : "text-white") : "text-ash/60",
                  )}
                >
                  {x.step?.skip ? <TimerOff className="my-0.5 inline size-4" /> : (x.step?.slot ?? "?")}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
