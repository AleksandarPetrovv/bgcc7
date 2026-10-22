"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ban, CircleHelp, Crown, Dices, Lock, Pause, Play, Redo2, RotateCcw, Swords, TimerOff, Undo2 } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { EASE } from "@/components/site/motion";
import { plan, type DraftStep, type DraftUndo, type DraftView, type Side, type Turn } from "@/lib/draft";
import { cn } from "@/lib/utils";
import { GOLD, TEAM, tint } from "@/lib/theme";
import { holdDraft, redoDraft, resumeDraft, undoDraft } from "@/app/(site)/admin/draft/actions";
import { Waiting } from "./draft-popups";

export type TeamInfo = {
  name: string;
  image: string;
  captain: string;
  players: string[];
};

function RollNumber({ value, side, win, lose }: { value: number | null; side: Side; win: boolean; lose: boolean }) {
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
    let alive = true;
    let delay = 30;
    let timer: ReturnType<typeof setTimeout>;
    const start = performance.now();
    const tick = () => {
      if (!alive) return;
      if (performance.now() - start > 1300) {
        setShown(value);
        setSpinning(false);
        return;
      }
      setShown(1 + Math.floor(Math.random() * 100));
      delay *= 1.14;
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(() => {
      setSpinning(true);
      tick();
    }, 0);
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
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 flex flex-wrap items-center gap-2 border border-dashed border-line bg-coal/80 px-3 py-2 text-xs font-display font-bold"
    >
      <div className="flex flex-1 gap-1">
        {([1, 2] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onActing(s)}
            aria-pressed={acting === s}
            className={cn("relative min-h-8 -skew-x-12 px-3 text-xs font-display font-bold transition-colors", acting === s ? "text-white" : "text-ash hover:text-paper")}
          >
            {acting === s && <motion.span layoutId="dr-acting" className={cn("absolute inset-0", TEAM[s].bg)} transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative inline-block max-w-32 skew-x-12 truncate">{names[s - 1]}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onHelp}
        className="lift-sm inline-flex min-h-8 -skew-x-12 items-center bg-gold px-4 text-xs font-display font-bold text-on-fill shadow-[3px_3px_0_0_var(--gold-deep)] transition-colors [--lift:var(--gold)] hover:bg-paper hover:text-ink"
      >
        <span className="inline-flex skew-x-12 items-center gap-1.5">
          <CircleHelp className="size-3.5" strokeWidth={3} /> {t.lobby.help}
        </span>
      </button>
      <button
        type="button"
        disabled={pending}
        aria-pressed={!!d.pausedAt}
        onClick={() => adminAct(() => (d.pausedAt ? resumeDraft(matchId) : holdDraft(matchId)))}
        className="lift-sm inline-flex min-h-8 -skew-x-12 items-center bg-rose px-4 text-xs font-display font-bold text-white shadow-[3px_3px_0_0_var(--rose-deep)] transition-colors [--lift:var(--rose)] hover:bg-paper hover:text-ink disabled:opacity-50"
      >
        <span className="inline-flex skew-x-12 items-center gap-1.5">
          {d.pausedAt ? <Play className="size-3.5 fill-current" strokeWidth={3} /> : <Pause className="size-3.5 fill-current" strokeWidth={3} />}
          {d.pausedAt ? t.draft.unhold : t.draft.hold}
        </span>
      </button>
      <span className="flex flex-1 justify-end gap-2">
        {([
          ["undo", d.undo, Undo2, () => undoDraft(matchId)],
          ["redo", d.redo, Redo2, () => redoDraft(matchId)],
        ] as const).map(([k, u, Icon, fn]) => (
          <button
            key={k}
            type="button"
            disabled={pending || !u}
            onClick={() => adminAct(fn)}
            className="lift-sm inline-flex min-h-8 -skew-x-12 items-center border border-line px-3 text-xs font-display font-bold text-paper transition-colors [--lift:var(--rose)] hover:border-rose disabled:opacity-50"
          >
            <span className="inline-flex skew-x-12 items-center gap-1.5">
              <Icon className="size-3.5" /> {k === "undo" ? t.draft.undo : t.draft.redo}
              {u && <span className="normal-case text-ash">· {stepText(u)}</span>}
            </span>
          </button>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={onReset}
          className="lift-sm inline-flex min-h-8 -skew-x-12 items-center border border-rose px-3 text-xs font-display font-bold text-rose-hi transition-colors [--lift:var(--rose)] hover:bg-rose/10 disabled:opacity-50"
        >
          <span className="inline-flex skew-x-12 items-center gap-1.5">
            <RotateCcw className="size-3.5" /> {t.draft.reset}
          </span>
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
        className={cn("flex min-w-0 items-center gap-3 sm:gap-5", s === 2 && "flex-row-reverse text-right")}
      >
        {tm.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tm.image} alt="" className="size-12 shrink-0 -skew-x-6 border-2 object-cover sm:size-20" style={{ borderColor: TEAM[s].c, boxShadow: `5px 5px 0 0 ${TEAM[s].deep}` }} />
        ) : (
          <span className="size-12 shrink-0 -skew-x-6 border-2 bg-slate sm:size-20" style={{ borderColor: TEAM[s].c, boxShadow: `5px 5px 0 0 ${TEAM[s].deep}` }} />
        )}
        <div className={cn("flex min-w-0 flex-1 flex-col gap-2", s === 2 && "items-end")}>
          <div className="heading-slam w-full truncate text-lg leading-none text-paper sm:text-3xl">{tm.name}</div>
          <div className={cn("flex w-full items-center gap-2", s === 2 && "flex-row-reverse")}>
            {me === s && (
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.7 }}
                className="inline-flex shrink-0 -skew-x-12 items-center px-2 py-0.5 text-white"
                style={{ background: TEAM[s].c }}
              >
                <span className="inline-flex skew-x-12 items-center gap-1 text-[0.6rem] font-display font-bold sm:text-[0.65rem]">
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
                        className="lift-sm inline-flex min-h-11 -skew-x-12 items-center px-6 font-display font-bold text-white disabled:opacity-60"
                        style={{
                          background: TEAM[s].c,
                          ["--lift" as string]: TEAM[s].deep,
                        }}
                      >
                        <span className="inline-flex skew-x-12 items-center gap-2">
                          <Dices className={cn("size-5", busy && "animate-spin")} /> {t.draft.roll}
                        </span>
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
                  "relative flex w-16 shrink-0 -skew-x-12 flex-col items-center justify-center border-2 py-1.5 sm:w-20",
                  (!x.step || x.step.skip) && "border-dashed",
                )}
                style={{
                  borderColor: TEAM[x.team].c,
                  background: x.step ? (x.kind === "ban" || x.step.skip ? "var(--coal)" : TEAM[x.team].c) : now ? tint(TEAM[x.team].c, 13) : "transparent",
                }}
                title={x.step?.skip ? t.draft.skipped : undefined}
              >
                {now && <span className="dr-glow absolute inset-0" style={{ background: tint(TEAM[x.team].c, 20) }} aria-hidden />}
                <span
                  className={cn(
                    "relative skew-x-12 text-[0.6rem] font-display font-bold",
                    x.step && !x.step.skip && x.kind === "pick" ? "text-white/80" : TEAM[x.team].text,
                  )}
                >
                  {x.kind === "ban" ? <Ban className="inline size-3" /> : <Swords className="inline size-3" />}
                </span>
                <span
                  className={cn(
                    "num relative skew-x-12 text-base font-display font-black leading-tight",
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
