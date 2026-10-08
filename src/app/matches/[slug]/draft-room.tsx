"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Ban, Check, Copy, Crown, Dices, DoorClosed, Eye, ListOrdered, Lock, Pause, Redo2, RotateCcw, Settings, Star, Swords, TimerOff, Undo2, WifiOff } from "lucide-react";
import { Sparkle } from "@/components/site/graphics";
import { useDict } from "@/components/site/lang";
import { EASE } from "@/components/site/motion";
import { MODS, fmtLen, type Beatmap, type Match } from "@/lib/data";
import { Confetti } from "@/components/site/confetti";
import { deadline, limitOf, pickable, plan, rollWinner, scoreOf, turnOf, type DraftStep, type DraftUndo, type DraftView, type Side, type Turn } from "@/lib/draft";
import { cn } from "@/lib/utils";
import { slotColor } from "@/lib/format-plan";
import { GOLD, TEAM, tint } from "@/lib/theme";
import { redoDraft, resetDraft, undoDraft } from "@/app/admin/draft/actions";
import { LobbyPanel, lobbyPost } from "./lobby-panel";
import { useSSE } from "@/components/site/use-sse";
import { Costs, MapCard, MatchDialog } from "@/components/site/match-dialog";
import type { MapResult, Scoreboard } from "@/lib/scoreboard";

type TeamInfo = {
  name: string;
  image: string;
  captain: string;
  players: string[];
};
type Pool = { category: string; color?: string; maps: Beatmap[] }[];


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
          className={cn("num text-7xl font-black tabular-nums sm:text-8xl", shown == null ? "text-line" : spinning ? "text-paper/70 blur-[1px]" : TEAM[side].text)}
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
              className="absolute -top-1 right-3 text-gold sm:right-8"
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

const noop = () => () => {};

const POP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} as const;

function Portal({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return ready ? createPortal(children, document.body) : null;
}

function ChoosePopup({ me, busy, onPick }: { me: Side; busy: boolean; onPick: (c: "pick" | "ban") => void }) {
  const t = useDict();
  const [choice, setChoice] = useState<"pick" | "ban" | null>(null);
  const col = TEAM[me];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.15 } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        className="relative w-full max-w-lg overflow-hidden border-2 bg-coal p-6 sm:p-8"
        style={{ borderColor: col.c, boxShadow: `8px 8px 0 0 ${col.deep}` }}
        role="dialog"
        aria-modal="true"
      >
        <Crown className="size-10 fill-current text-gold" />
        <h3 className="heading-slam mt-3 text-4xl sm:text-5xl" style={{ color: col.hi }}>
          {t.draft.choose}
        </h3>
        <p className="mt-1 text-sm font-bold text-ash">{t.draft.chooseHint}</p>
        <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup">
          {(["pick", "ban"] as const).map((c) => {
            const on = choice === c;
            const Icon = c === "pick" ? Swords : Ban;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setChoice(c)}
                className={cn(
                  "group relative flex -skew-x-6 cursor-pointer select-none flex-col items-center gap-2 border-2 px-3 py-6 font-black uppercase transition-[transform,color,border-color,translate,scale,rotate] duration-200 active:scale-95",
                  on ? "text-white" : "border-line text-ash hover:-translate-y-1 hover:text-paper",
                )}
                style={on ? { borderColor: col.c } : undefined}
              >
                {on && <span className="absolute inset-0" style={{ background: col.c, boxShadow: `5px 5px 0 0 ${col.deep}` }} aria-hidden />}
                <span className="relative flex skew-x-6 flex-col items-center gap-2">
                  <Icon className={cn("size-8 transition-transform duration-300", on ? "scale-110" : c === "pick" ? "group-hover:rotate-12" : "group-hover:-rotate-12")} />
                  <span className="heading-slam text-xl sm:text-2xl">{c === "pick" ? t.draft.firstPick : t.draft.firstBan}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={!choice || busy}
          onClick={() => choice && onPick(choice)}
          className="sheen heading-slam mt-5 flex min-h-14 w-full -skew-x-12 items-center justify-center text-2xl text-white transition-[transform,opacity,filter,translate,scale,rotate] duration-200 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35"
          style={{
            background: choice ? col.c : "var(--color-slate)",
            boxShadow: choice ? `5px 5px 0 0 ${col.deep}` : undefined,
          }}
        >
          <span className="inline-flex skew-x-12 items-center gap-2">
            {busy ? <Waiting /> : <Check className="size-6" strokeWidth={3} />}
            {t.draft.select}
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
}

const clockText = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function TimerDock({
  left,
  total,
  color,
  label,
  pause,
  raised,
  calm,
}: {
  left: number;
  total: number;
  color: { c: string; hi: string; deep: string };
  label: string;
  pause?: boolean;
  raised?: boolean;
  calm?: boolean;
}) {
  const low = !pause && !calm && left <= 10_000;
  const pct = total ? Math.max(0, Math.min(1, left / total)) : 0;
  const tone = pause ? { ...GOLD, hi: GOLD.c } : low ? { c: TEAM[1].c, hi: TEAM[1].hi, deep: TEAM[1].deep } : color;
  const { c, hi, deep } = tone;
  return (
    <motion.div
      initial={{ y: 120, opacity: 0, x: "-50%" }}
      animate={{ y: raised ? -84 : 0, opacity: 1, x: "-50%" }}
      exit={{ y: 120, opacity: 0, x: "-50%" }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 w-[min(26rem,calc(100vw-2rem))]"
      role="timer"
      aria-live="off"
    >
      <motion.div
        animate={low && left > 0 ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={low ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
        className="relative -skew-x-12 overflow-hidden border-2 bg-ink/95 px-5 pb-3 pt-2 backdrop-blur"
        style={{ borderColor: c, boxShadow: `6px 6px 0 0 ${deep}, 0 0 40px -10px ${c}` }}
      >
        <div className="flex skew-x-12 items-center gap-4">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.2em]" style={{ color: hi }}>
              {pause && <Pause className="size-3.5" />}
              <span className="truncate">{label}</span>
            </span>
            <span className="mt-2 block h-2 -skew-x-12 overflow-hidden bg-slate">
              <span
                className="block h-full transition-[width,background-color] duration-300 ease-linear"
                style={{ width: `${pct * 100}%`, background: c, boxShadow: `0 0 12px ${c}` }}
              />
            </span>
          </span>
          <span
            className="num shrink-0 text-5xl font-black tabular-nums leading-none sm:text-6xl"
            style={{ color: low || pause ? hi : "var(--color-paper)", textShadow: `0 0 24px ${tint(c, 40)}` }}
          >
            {clockText(left)}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WinnerPopup({
  slot,
  map,
  teams,
  current,
  onPick,
  onClose,
  onScores,
}: {
  slot: string;
  map: Beatmap;
  teams: [string, string];
  current?: Side;
  onPick: (w: Side) => void;
  onClose: () => void;
  onScores?: () => void;
}) {
  const t = useDict();
  const [busy, setBusy] = useState<Side | null>(null);
  const color = slotColor(slot);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        className="relative w-full max-w-xl overflow-hidden border-2 border-line bg-coal p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative text-center">
          <Crown className="mx-auto size-9 fill-current text-gold" />
          <h3 className="heading-slam mt-2 text-4xl sm:text-5xl">{t.draft.whoWon}</h3>
          <p className="mt-1 truncate text-sm font-bold text-ash">
            <span style={{ color }}>{slot}</span> · {map.title}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            {([1, 2] as const).map((s) => (
              <motion.button
                key={s}
                type="button"
                disabled={busy != null}
                onClick={() => {
                  setBusy(s);
                  onPick(s);
                }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.1 }}
                className={cn(
                  "group relative flex min-h-28 flex-col items-center justify-center gap-2 overflow-hidden px-3 text-white disabled:opacity-60",
                  "-skew-x-6",
                )}
                style={{
                  background: `linear-gradient(${s === 1 ? "135deg" : "225deg"}, ${TEAM[s].c}, ${TEAM[s].deep})`,
                  boxShadow: current === s ? `0 0 0 3px var(--color-paper), 5px 5px 0 0 ${TEAM[s].deep}` : `5px 5px 0 0 ${TEAM[s].deep}`,
                }}
              >
                <span className="pointer-events-none absolute -right-4 -top-4 size-16 rotate-45 bg-white/10 transition-transform duration-300 group-hover:scale-150" aria-hidden />
                <span className={cn("relative flex max-w-full flex-col items-center gap-1", "skew-x-6")}>
                  <span className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-white/70">{s === 1 ? t.draft.red : t.draft.blue}</span>
                  <span className="line-clamp-2 max-w-full break-words text-sm font-black uppercase leading-tight sm:text-base">{teams[s - 1]}</span>
                  {busy === s && <Waiting />}
                </span>
              </motion.button>
            ))}
          </div>
          {onScores && (
            <button
              type="button"
              onClick={onScores}
              className="mt-5 inline-flex min-h-9 -skew-x-12 items-center border border-paper/40 px-4 text-xs font-black uppercase tracking-wide text-paper transition-colors hover:border-paper"
            >
              <span className="inline-flex skew-x-12 items-center gap-1.5">
                <ListOrdered className="size-3.5" /> {t.draft.fullScores}
              </span>
            </button>
          )}
          <button type="button" onClick={onClose} className="mt-5 block w-full text-xs font-black uppercase tracking-wide text-ash hover:text-paper">
            {t.draft.later}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScoresPopup({ slug, slot, names, onClose }: { slug: string; slot: string; names: [string, string]; onClose: () => void }) {
  const t = useDict();
  const [data, setData] = useState<{ board: Scoreboard; map: MapResult } | "none" | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/matches/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Scoreboard) => {
        const map = d.maps.findLast((m) => m.slot === slot && !m.note);
        if (live) setData(map ? { board: d, map } : "none");
      })
      .catch(() => live && setData("none"));
    return () => {
      live = false;
    };
  }, [slug, slot]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {data && data !== "none" ? (
          <div className="space-y-3 bg-ink">
            <MapCard m={data.map} i={0} />
            <Costs data={{ ...data.board, maps: [data.map] }} names={names} finished={false} />
          </div>
        ) : (
          <div className="border border-line bg-coal px-6 py-10 text-center text-sm font-bold text-ash">{data === "none" ? t.draft.noScores : <Waiting />}</div>
        )}
        <button type="button" onClick={onClose} className="mt-3 block w-full text-xs font-black uppercase tracking-wide text-ash hover:text-paper">
          {t.draft.close}
        </button>
      </motion.div>
    </motion.div>
  );
}

function ResetPopup({ lobby, busy, onCancel, onReset }: { lobby: boolean; busy: boolean; onCancel: () => void; onReset: (close: boolean) => void }) {
  const t = useDict();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden border-2 border-rose bg-coal p-6 shadow-[8px_8px_0_0_var(--color-rose-deep)]"
        role="dialog"
        aria-modal="true"
      >
        <RotateCcw className="size-8 text-rose-hi" />
        <h3 className="heading-slam mt-2 text-3xl">{t.draft.resetTitle}</h3>
        <p className="mt-1 text-sm font-bold text-paper/70">{t.draft.resetBody}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          {lobby && (
            <motion.button
              type="button"
              disabled={busy}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onReset(true)}
              className="flex min-h-12 -skew-x-6 items-center bg-rose px-5 text-left font-black uppercase tracking-wide text-white shadow-[5px_5px_0_0_var(--color-rose-deep)] disabled:opacity-60"
            >
              <span className="inline-flex skew-x-6 items-center gap-2">
                <DoorClosed className="size-4" /> {t.draft.resetClose}
              </span>
            </motion.button>
          )}
          <motion.button
            type="button"
            disabled={busy}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onReset(false)}
            className={cn(
              "flex min-h-12 -skew-x-6 items-center px-5 text-left font-black uppercase tracking-wide disabled:opacity-60",
              lobby ? "border border-rose text-rose-hi hover:bg-rose/10" : "bg-rose text-white shadow-[5px_5px_0_0_var(--color-rose-deep)]",
            )}
          >
            <span className="inline-flex skew-x-6 items-center gap-2">
              <RotateCcw className="size-4" /> {lobby ? t.draft.resetKeep : t.draft.reset}
            </span>
          </motion.button>
          <button type="button" onClick={onCancel} className="mt-1 text-xs font-black uppercase tracking-wide text-ash hover:text-paper">
            {t.draft.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CopyId({ id }: { id: number }) {
  const [done, setDone] = useState(false);
  const copy = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard
      .writeText(String(id))
      .then(() => {
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      })
      .catch(() => {});
  };
  return (
    <span className="num mt-1 flex items-center gap-1.5 text-sm font-bold text-paper/75">
      ID <span className="select-all text-paper">{id}</span>
      <span
        role="button"
        tabIndex={0}
        title="Copy"
        onClick={copy}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && copy(e)}
        className="inline-flex size-6 cursor-pointer items-center justify-center border border-line text-ash transition-colors hover:border-paper hover:text-paper"
      >
        {done ? <Check className="size-3.5 text-balkan" strokeWidth={3} /> : <Copy className="size-3.5" />}
      </span>
    </span>
  );
}

function Waiting() {
  return (
    <span className="dr-dots inline-flex gap-1" aria-hidden>
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
}

export function DraftRoom({
  slug,
  matchId,
  match,
  initial,
  teams,
  pools,
  title,
  firstTo,
  admin,
  side,
}: {
  slug: string;
  matchId: string;
  match: Match | null;
  initial: DraftView;
  teams: [TeamInfo, TeamInfo];
  pools: Pool;
  title: string;
  firstTo: number;
  admin: boolean;
  side: Side | null;
}) {
  const t = useDict();
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [acting, setActing] = useState<Side>(side ?? 1);
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [holdUntil, setHoldUntil] = useState(0);
  const rolled = useRef(initial.roll1 != null && initial.roll2 != null);
  const wonBy = (v: DraftView): Side | null => {
    const [a, b] = scoreOf(v);
    return v.firstTo && a >= v.firstTo ? 1 : v.firstTo && b >= v.firstTo ? 2 : null;
  };
  const won = useRef(!admin && !!side && wonBy(initial) === side);
  const [party, setParty] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const [pending, start] = useTransition();
  const adminAct = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
      } catch {
        window.location.reload();
      }
    });
  const [ask, setAsk] = useState<string | null>(null);
  const [scores, setScores] = useState<string | null>(null);
  const lobbyOpen = useRef(false);
  const [askReset, setAskReset] = useState(false);
  const [lobbyShown, setLobbyShown] = useState(false);
  const onLobby = useCallback((o: boolean) => {
    lobbyOpen.current = o;
    setLobbyShown(o);
  }, []);
  const mapOf = useMemo(() => new Map(pools.flatMap((p) => p.maps.map((m) => [m.slot, m] as const))), [pools]);

  const take = useCallback(
    (next: DraftView) => {
      const both = next.roll1 != null && next.roll2 != null;
      if (both && !rolled.current) setHoldUntil(Date.now() + 1600);
      rolled.current = both;
      const w = !!side && wonBy(next) === side;
      if (w && !won.current) setParty(true);
      won.current = w;
      setD((cur) => (next.rev >= cur.rev ? next : cur));
    },
    [side],
  );
  const me: Side | null = admin ? acting : side;

  const slots = useMemo(() => pools.flatMap((p) => p.maps.map((m) => m.slot)).filter(pickable), [pools]);
  const hold = clock < holdUntil;
  const real = turnOf(d, slots);
  const turn: Turn = hold && (real.kind === "choose" || real.kind === "tie") ? { kind: "roll" } : real;
  const winner = hold ? null : rollWinner(d);
  const name = (s: Side) => teams[s - 1].name;
  const stepText = (u: DraftUndo) =>
    u.kind === "winner" ? t.draft.stepWin(u.slot) : u.kind === "step" ? (u.step.skip ? t.draft.stepSkip : t.draft.stepDo(u.step.kind, u.step.slot)) : u.kind === "choice" ? t.draft.stepChoice : t.draft.stepRolls;
  const mine = "team" in turn && turn.team === me;
  const stageRef = useRef(initial.stageSlug);

  useEffect(() => {
    if (!err) return;
    const id = setTimeout(() => setErr(false), 3500);
    return () => clearTimeout(id);
  }, [err]);

  useSSE(
    `/api/draft/${slug}`,
    (raw) => {
      try {
        const next = JSON.parse(raw) as DraftView | null;
        if (!next || (!next.open && !admin) || next.stageSlug !== stageRef.current) {
          router.refresh();
          if (next) stageRef.current = next.stageSlug;
        }
        if (next) {
          setOffset(next.now - Date.now());
          take(next);
        }
      } catch {}
    },
    (on) => setOffline(!on),
  );

  async function act(body: Record<string, unknown>) {
    if (busy || !me) return;
    setBusy(true);
    setErr(false);
    const res = await fetch(`/api/draft/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, side: me }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setErr(true);
    const next = (await res.json()) as DraftView;
    take(next);
    setSel(null);
  }

  const picked = d.steps.filter((s) => s.kind === "pick" && !s.skip);
  const scored = picked.length > 0;
  const score = [picked.filter((s) => s.winner === 1).length, picked.filter((s) => s.winner === 2).length];

  async function result(slot: string, winner: Side) {
    const res = await fetch(`/api/draft/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ act: "result", slot, winner }),
    }).catch(() => null);
    if (!res?.ok) return setErr(true);
    take((await res.json()) as DraftView);
    setAsk(null);
  }

  const used = new Map(
    d.steps.flatMap((s, i) =>
      s.skip
        ? []
        : [
            [
              s.slot,
              {
                ...s,
                n: d.steps.slice(0, i + 1).filter((x) => x.kind === s.kind).length,
              },
            ] as const,
          ],
    ),
  );
  const paused = !!d.pausedAt;
  const now = clock + offset;
  const dl = deadline(d, slots);
  const limit = limitOf(d, turn.kind) * 1000;
  const left = dl == null ? null : Math.max(0, dl - (paused ? new Date(d.pausedAt!).getTime() : now));
  const pauseLeft = paused && d.pauseUntil ? Math.max(0, new Date(d.pauseUntil).getTime() - now) : 0;
  const playMap = d.playing ? pools.flatMap((p) => p.maps).find((m) => m.id === d.playing!.mapId) : undefined;
  const playTotal = playMap ? (playMap.length * 1000) / (playMap.mod === "DT" ? 1.5 : 1) : 0;
  const playLeft = d.playing ? (playTotal ? Math.max(0, d.playing.at + playTotal - now) : Math.max(0, now - d.playing.at)) : 0;
  const playTeam = (playMap && used.get(playMap.slot)?.team) || 1;
  const canTap = (slot: string) => !paused && (turn.kind === "ban" || turn.kind === "pick") && mine && pickable(slot) && !used.has(slot);
  const rolling = turn.kind === "roll" || turn.kind === "tie";

  const headline =
    turn.kind === "roll"
      ? t.draft.rollHint
      : turn.kind === "tie"
        ? t.draft.tie
        : turn.kind === "choose"
          ? t.draft.choosing(name(turn.team))
          : turn.kind === "done"
            ? score[0] >= d.firstTo || score[1] >= d.firstTo
              ? t.draft.matchWon(name(score[0] > score[1] ? 1 : 2))
              : t.draft.done
            : turn.kind === "wait"
              ? d.playing
                ? ""
                : t.draft.waitStart
              : turn.team === me
                ? t.draft.yours(turn.kind)
                : t.draft.turn(name(turn.team), turn.kind);
  const headColor = "team" in turn ? TEAM[turn.team].hi : "var(--color-paper)";

  const realBans = d.steps.filter((s) => s.kind === "ban" && !s.skip);
  const seq: { team: Side; kind: "ban" | "pick"; step?: DraftStep }[] = [
    ...plan(d).map((p, i) => ({ kind: p.kind, step: realBans[i], team: realBans[i]?.team ?? (turn.kind === "ban" && i === realBans.length ? turn.team : p.team) })),
    ...picked.map((s) => ({ team: s.team, kind: "pick" as const, step: s })),
    ...(turn.kind === "pick" ? [{ team: turn.team, kind: "pick" as const }] : []),
  ];
  const firstOpen = seq.findIndex((x) => !x.step);
  const unscored = admin ? picked.find((s) => !s.winner) : undefined;

  return (
    <div className="relative mx-auto w-full max-w-page px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:px-10 2xl:px-14">
      {admin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex flex-wrap items-center gap-2 border border-dashed border-line bg-coal/80 px-3 py-2 text-xs font-black uppercase tracking-wide"
        >
          <div className="flex gap-1">
            {([1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActing(s)}
                aria-pressed={acting === s}
                className={cn("relative min-h-8 -skew-x-12 px-3 text-xs font-black uppercase tracking-wide transition-colors", acting === s ? "text-white" : "text-ash hover:text-paper")}
              >
                {acting === s && <motion.span layoutId="dr-acting" className={cn("absolute inset-0", TEAM[s].bg)} transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span className="relative inline-block max-w-32 skew-x-12 truncate">{name(s)}</span>
              </button>
            ))}
          </div>
          <span className="ml-auto flex gap-2">
            {([
              ["undo", d.undo, Undo2, () => undoDraft(matchId)],
              ["redo", d.redo, Redo2, () => redoDraft(matchId)],
            ] as const).map(([k, u, Icon, fn]) => (
              <button
                key={k}
                type="button"
                disabled={pending || !u}
                onClick={() => adminAct(fn)}
                className="lift-sm inline-flex min-h-8 -skew-x-12 items-center border border-line px-3 text-xs font-black uppercase tracking-wide text-paper transition-colors [--lift:var(--color-rose)] hover:border-rose disabled:opacity-50"
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
              onClick={() => setAskReset(true)}
              className="lift-sm inline-flex min-h-8 -skew-x-12 items-center border border-rose px-3 text-xs font-black uppercase tracking-wide text-rose-hi transition-colors [--lift:var(--color-rose)] hover:bg-rose/10 disabled:opacity-50"
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
      )}
      <Portal>
      <AnimatePresence>
        {askReset && (
          <ResetPopup
            lobby
            busy={pending}
            onCancel={() => setAskReset(false)}
            onReset={(close) => {
              setAskReset(false);
              adminAct(async () => {
                await resetDraft(matchId);
                if (close) await lobbyPost(slug, { act: "close" });
              });
            }}
          />
        )}
      </AnimatePresence>
      </Portal>

      <div className={cn((admin || lobbyShown) && "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(26rem,30%)] xl:items-start xl:gap-8 2xl:gap-10")}>
      <motion.aside
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        className="xl:col-start-2 xl:row-start-1"
      >
        <LobbyPanel slug={slug} maps={pools.flatMap((p) => p.maps)} onOpen={onLobby} readOnly={!admin} />
      </motion.aside>
      <div className="@container min-w-0 xl:col-start-1 xl:row-start-1">
      <div className="relative flex items-stretch">
        {([1, 2] as const).map((s) => {
          const on = "team" in turn && turn.team === s;
          const tm = teams[s - 1];
          const box = (
            <motion.div
              key={`box${s}`}
              layout
              initial={{ opacity: 0, x: s === 1 ? -90 : 90 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.05, layout: { type: "spring", stiffness: 260, damping: 30 } }}
              className={cn("relative min-w-0 flex-1 overflow-hidden", s === 1 ? "order-1" : "order-5")}
            >
              <div
                className={cn(
                  "relative flex h-full items-center gap-3 px-3 py-4 transition-[filter,opacity] duration-500 sm:gap-4 sm:px-5 sm:py-6",
                  s === 2 && "flex-row-reverse text-right",
                )}
                style={{
                  background: `linear-gradient(${s === 1 ? "100deg" : "260deg"}, ${TEAM[s].c} 0%, ${TEAM[s].deep} 55%, transparent 100%)`,
                  clipPath: s === 1 ? "polygon(0 0, 100% 0, calc(100% - 22px) 100%, 0 100%)" : "polygon(22px 0, 100% 0, 100% 100%, 0 100%)",
                  filter: "team" in turn && !on ? "saturate(0.55) brightness(0.8)" : undefined,
                }}
              >
                {tm.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tm.image}
                    alt=""
                    className={cn("size-11 shrink-0 -skew-x-6 border-2 border-white/80 object-cover shadow-[4px_4px_0_0_rgba(0,0,0,0.35)] sm:size-16", scored && "hidden sm:block")}
                  />
                )}
                <div className={cn("flex min-w-0 flex-col", s === 2 ? "items-end" : "items-start")}>
                  <div className="heading-slam w-full truncate text-base leading-none text-white sm:text-2xl lg:text-3xl">{tm.name}</div>
                  {me === s && (
                    <motion.span
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.7 }}
                      className="mt-2 inline-flex -skew-x-12 items-center bg-white px-2 py-0.5 shadow-[3px_3px_0_0_rgba(0,0,0,0.35)]"
                      style={{ color: TEAM[s].deep }}
                    >
                      <span className="inline-flex skew-x-12 items-center gap-1 text-[0.6rem] font-black uppercase tracking-[0.25em] sm:text-[0.65rem]">
                        <span className="anim-twinkle" aria-hidden>
                          ✦
                        </span>
                        {t.draft.you}
                      </span>
                    </motion.span>
                  )}
                </div>
                <span
                  className={cn(
                    "dr-beads pointer-events-none absolute inset-x-3 bottom-1.5 h-2 transition-opacity duration-500",
                    s === 2 && "dr-beads-l",
                    on ? "dr-beads-on text-white/80" : "text-white/25",
                  )}
                  aria-hidden
                />
              </div>
            </motion.div>
          );
          const scoreEl = scored && (
            <motion.div
              key={`score${s}`}
              layout
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.25 }}
              className={cn("flex min-w-10 items-center justify-center px-1 sm:min-w-20 sm:px-3", s === 1 ? "order-2" : "order-4")}
            >
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={score[s - 1]}
                  initial={{ y: -30, opacity: 0, scale: 1.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                  className="num text-4xl font-black tabular-nums sm:text-7xl"
                  style={{ color: TEAM[s].hi, textShadow: `0 0 28px ${tint(TEAM[s].c, 40)}` }}
                >
                  {score[s - 1]}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          );
          return [box, scoreEl];
        })}
        <motion.div
          layout
          initial={{ scale: 3, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.45 }}
          className={cn("relative z-10 order-3 flex flex-col items-center justify-center px-1", !scored && "-mx-3 sm:-mx-4")}
        >
          <span className={cn("heading-slam text-paper drop-shadow-[3px_3px_0_var(--color-ink)]", scored ? "text-xl sm:text-4xl" : "text-3xl sm:text-6xl")}>VS</span>
        </motion.div>
      </div>

      {match && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4, ease: EASE }} className="mt-3 flex justify-center">
          <MatchDialog match={match} compact />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs font-black uppercase tracking-[0.15em] text-ash"
      >
        <span>{title}</span>
        <span className="size-1 rotate-45 bg-line" aria-hidden />
        <span>{t.admin.firstToShort(firstTo)}</span>
      </motion.div>

      <div className="relative mt-8 flex min-h-16 items-center justify-center overflow-hidden text-center sm:mt-10">
        <AnimatePresence mode="wait">
          <motion.h2
            key={headline}
            initial={{ y: 40, opacity: 0, skewX: -12 }}
            animate={{ y: 0, opacity: 1, skewX: 0 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="heading-slam flex items-center gap-3 text-[clamp(1.6rem,6vw,3.25rem)] leading-none"
            style={{ color: headColor }}
          >
            {mine && turn.kind !== "choose" && <Sparkle className="relative size-6 text-current" />}
            {headline}
            {"team" in turn && !mine && <Waiting />}
          </motion.h2>
        </AnimatePresence>
      </div>
      {mine && !paused && (turn.kind === "ban" || turn.kind === "pick") && (
        <motion.p key={`${turn.kind}${turn.n}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-center text-sm font-bold text-ash">
          {t.draft.tapMap(turn.kind)}
        </motion.p>
      )}

      <AnimatePresence>
        {unscored && mapOf.get(unscored.slot) && (
          <motion.div
            key={`ask${unscored.slot}`}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className="mt-4 flex justify-center"
          >
            <button
              type="button"
              onClick={() => setAsk(unscored.slot)}
              title={t.draft.whoWonHint}
              className="group inline-flex min-h-8 -skew-x-12 items-center border border-dashed border-gold/60 px-3 text-gold/80 transition-colors hover:border-gold hover:text-gold"
            >
              <span className="flex skew-x-12 items-center gap-1.5 text-[0.7rem] font-black uppercase tracking-wide">
                <Crown className="size-3.5" />
                {t.draft.whoWonSlot(unscored.slot)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {(rolling || turn.kind === "choose" || !d.choice) && (
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
                      borderColor: winner === s ? TEAM[s].c : "var(--color-line)",
                    }}
                  >
                    <span
                      className="dr-glow pointer-events-none absolute inset-0 opacity-0"
                      style={{
                        background: canRoll ? `radial-gradient(circle at 50% 60%, ${TEAM[s].c}33, transparent 70%)` : undefined,
                      }}
                      aria-hidden
                    />
                    <span className={cn("relative max-w-full truncate text-xs font-black uppercase tracking-[0.15em]", TEAM[s].text)}>{name(s)}</span>
                    <RollNumber value={val} side={s} win={winner === s} lose={winner != null && winner !== s} />
                    <div className="relative flex h-11 items-center">
                      {canRoll ? (
                        <motion.button
                          type="button"
                          disabled={busy || paused}
                          onClick={() => act({ act: "roll" })}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.9, rotate: -6 }}
                          className="lift-sm inline-flex min-h-11 -skew-x-12 items-center px-6 font-black uppercase tracking-wide text-white disabled:opacity-60"
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
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ash">
                          {t.draft.waiting} <Waiting />
                        </span>
                      ) : winner === s ? (
                        <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-black uppercase tracking-wide text-gold">
                          {t.draft.wins(name(s))}
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

      {d.choice && (
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
                      background: x.step ? (x.kind === "ban" || x.step.skip ? "var(--color-coal)" : TEAM[x.team].c) : now ? tint(TEAM[x.team].c, 13) : "transparent",
                    }}
                    title={x.step?.skip ? t.draft.skipped : undefined}
                  >
                    {now && <span className="dr-glow absolute inset-0" style={{ background: tint(TEAM[x.team].c, 20) }} aria-hidden />}
                    <span
                      className={cn(
                        "relative skew-x-12 text-[0.6rem] font-black uppercase tracking-wider",
                        x.step && !x.step.skip && x.kind === "pick" ? "text-white/80" : TEAM[x.team].text,
                      )}
                    >
                      {x.kind === "ban" ? <Ban className="inline size-3" /> : <Swords className="inline size-3" />}
                    </span>
                    <span
                      className={cn(
                        "num relative skew-x-12 text-base font-black leading-tight",
                        x.step?.skip ? "text-ash" : x.step ? (x.kind === "ban" ? "text-paper/60 line-through" : "text-white") : "text-ash/50",
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
      )}

      <section className="mt-8 space-y-6">
        {pools.map((p, pi) => {
          const skill = !!p.color;
          const mod = { label: MODS[p.category]?.label ?? p.category, color: p.color ?? MODS[p.category]?.color };
          const light = p.category === "Tiebreaker";
          return (
            <div key={p.category}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.5,
                  ease: EASE,
                  delay: 0.3 + pi * 0.06,
                }}
                className={cn("mb-2 inline-flex -skew-x-12 items-center gap-2 px-3 py-1 text-sm font-black uppercase", light ? "text-ink" : "text-white")}
                style={{ background: mod.color }}
              >
                <span className="skew-x-12">{mod.label}</span>
              </motion.div>
              <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2 @5xl:grid-cols-3 @[100rem]:grid-cols-4">
                {p.maps.map((m, k) => {
                  const u = used.get(m.slot);
                  const tb = !pickable(m.slot);
                  const tap = canTap(m.slot);
                  const chosen = sel === m.slot;
                  const col = u ? TEAM[u.team] : me ? TEAM[me] : TEAM[1];
                  const tbu = !!u && m.slot === "TB";
                  const grey = u?.kind === "ban" || !!u?.winner || tbu;
                  const peek = u?.kind === "pick" && (admin || !!u.winner);
                  return (
                    <div key={m.slot} className="relative">
                    <motion.button
                      type="button"
                      disabled={!tap}
                      onClick={() => tap && setSel(chosen ? null : m.slot)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: chosen ? 1.03 : 1,
                        transition: {
                          opacity: {
                            duration: 0.45,
                            delay: 0.35 + pi * 0.06 + k * 0.03,
                          },
                          y: {
                            duration: 0.45,
                            ease: EASE,
                            delay: 0.35 + pi * 0.06 + k * 0.03,
                          },
                          scale: {
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          },
                        },
                      }}
                      whileHover={tap ? { y: -3 } : undefined}
                      whileTap={tap ? { scale: 0.97 } : undefined}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "group relative flex w-full items-stretch overflow-hidden border-2 bg-coal text-left disabled:cursor-default",
                        admin ? "h-28" : "h-24",
                        tb && "border-dashed",
                        tap && "cursor-pointer",
                        grey && "brightness-[0.5] grayscale-[0.85] transition-[filter] duration-700",
                      )}
                      style={{
                        borderColor: (chosen || u) && !tbu ? col.c : tb ? "var(--color-line)" : "transparent",
                        boxShadow: chosen ? `5px 5px 0 0 ${col.deep}` : u?.kind === "pick" && !tbu ? `inset 6px 0 0 0 ${col.c}` : undefined,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.cover}
                        alt=""
                        className={cn(
                          "absolute inset-0 size-full object-cover transition duration-700",
                          grey
                            ? "opacity-15 grayscale"
                            : u?.kind === "pick"
                              ? "opacity-50"
                              : "opacity-50 group-hover:scale-105 group-enabled:group-hover:opacity-70",
                        )}
                      />
                      <span className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-transparent" aria-hidden />
                      {tap && !chosen && (
                        <span
                          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          style={{ boxShadow: `inset 0 0 0 2px ${col.c}` }}
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          "heading-slam relative flex w-[5.5rem] shrink-0 items-center justify-center pl-2 pr-1 text-lg sm:w-28 sm:text-2xl",
                          grey && "opacity-40",
                        )}
                        style={{ color: skill ? mod.color : slotColor(m.slot) }}
                      >
                        {m.slot}
                      </span>
                      <span className={cn("relative flex min-w-0 flex-1 flex-col justify-center pl-1 pr-3", grey && "opacity-40")}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-black sm:text-base">{m.title}</span>
                          {skill && !tb && MODS[m.mod] && (
                            <span className="shrink-0 -skew-x-12 border px-1.5 text-xs font-black leading-5" style={{ borderColor: MODS[m.mod].color, color: MODS[m.mod].color }}>
                              <span className="inline-block skew-x-12">{MODS[m.mod].short}</span>
                            </span>
                          )}
                        </span>
                        <span className="truncate text-xs text-paper/70">[{m.version}]</span>
                        <span className="num mt-1 flex items-center gap-2.5 text-xs text-ash">
                          <span className="flex items-center gap-0.5 text-gold">
                            <Star className="size-3 fill-current" /> {m.sr.toFixed(2)}
                          </span>
                          <span>{Math.round(m.bpm)}bpm</span>
                          <span>{fmtLen(m.length)}</span>
                        </span>
                        {admin && <CopyId id={m.id} />}
                      </span>
                      {u?.kind === "pick" && u.winner && !tbu && (
                        <motion.span
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className="absolute inset-x-0 bottom-0 flex h-5 origin-left items-center gap-1 pl-3 text-[0.6rem] font-black uppercase tracking-wider text-white"
                          style={{ background: TEAM[u.winner].c }}
                        >
                          <Crown className="size-3 fill-current" /> {t.draft.won(name(u.winner))}
                        </motion.span>
                      )}
                      <AnimatePresence>
                        {u && !tbu && (
                          <motion.span
                            key={u.kind}
                            initial={{
                              scale: 2.4,
                              opacity: 0,
                              rotate: u.kind === "ban" ? -30 : 20,
                            }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              rotate: u.kind === "ban" ? -10 : 6,
                            }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 17,
                            }}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border-[3px] px-2 py-0.5 text-center font-black uppercase leading-none"
                            style={{
                              borderColor: col.c,
                              color: col.hi,
                              background: "rgba(13,15,14,0.8)",
                            }}
                          >
                            <span className="block text-base tracking-wider sm:text-lg">
                              {u.kind === "ban" ? t.draft.banned : u.slot === "TB" ? t.draft.tiebreaker : t.draft.pick(u.n)}
                            </span>
                            {u.kind === "pick" && <span className="block max-w-28 truncate text-[0.55rem] tracking-wide text-paper/80">{name(u.team)}</span>}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {(u?.kind === "ban" || u?.winner) && !tbu && (
                        <motion.span
                          key={u.winner ?? "ban"}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
                          className="pointer-events-none absolute left-2 right-2 top-1/2 h-[3px] origin-left -rotate-[8deg]"
                          style={{ background: u.winner ? TEAM[u.winner].c : col.c }}
                          aria-hidden
                        />
                      )}
                    </motion.button>
                    {peek && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        onClick={() => (admin ? setAsk(m.slot) : setScores(m.slot))}
                        title={admin ? t.draft.mapSettings : t.draft.fullScores}
                        aria-label={admin ? t.draft.mapSettings : t.draft.fullScores}
                        className="group absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                      >
                        <span className="relative inline-flex h-8 w-12 -skew-x-12 items-center justify-center border border-rose bg-rose text-white shadow-[3px_3px_0_0_var(--color-rose-deep)] transition-[background-color,translate,box-shadow] duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-rose-hi group-hover:shadow-[5px_5px_0_0_var(--color-rose-deep)]">
                          {admin ? <Settings className="size-[18px] skew-x-12" /> : <Eye className="size-[18px] skew-x-12" />}
                        </span>
                      </motion.button>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
      </div>
      </div>

      <Portal>
        {party && <Confetti onDone={() => setParty(false)} />}
        <AnimatePresence>
          {paused ? (
            <TimerDock
              key="pause"
              pause
              left={pauseLeft}
              total={d.pauseUntil && d.pausedAt ? new Date(d.pauseUntil).getTime() - new Date(d.pausedAt).getTime() : 1}
              color={TEAM[1]}
              label={t.draft.paused}
            />
          ) : d.playing ? (
            <TimerDock key="play" calm left={playLeft} total={playTotal} color={TEAM[playTeam]} label={playMap ? `${t.lobby.mapPlaying} · ${playMap.slot}` : t.lobby.mapPlaying} />
          ) : (
            left != null && "team" in turn && <TimerDock key="turn" left={left} total={limit} color={TEAM[turn.team]} label={headline} raised={!!sel && mine} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {ask && mapOf.get(ask) && (
            <WinnerPopup
              key={`w${ask}`}
              slot={ask}
              map={mapOf.get(ask)!}
              teams={[name(1), name(2)]}
              current={used.get(ask)?.winner}
              onPick={(w) => result(ask, w)}
              onClose={() => setAsk(null)}
              onScores={used.get(ask)?.winner ? () => (setScores(ask), setAsk(null)) : undefined}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>{scores && <ScoresPopup key={`s${scores}`} slug={slug} slot={scores} names={[name(1), name(2)]} onClose={() => setScores(null)} />}</AnimatePresence>
        <AnimatePresence>
          {sel && (turn.kind === "ban" || turn.kind === "pick") && mine && me && (
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-40 border-t-2 bg-ink/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
              style={{ borderColor: TEAM[me].c }}
            >
              <div className="mx-auto flex max-w-page items-center gap-3 lg:px-6">
                <button type="button" onClick={() => setSel(null)} className="min-h-12 px-3 text-sm font-black uppercase tracking-wide text-ash hover:text-paper">
                  {t.draft.cancel}
                </button>
                <motion.button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ act: turn.kind, slot: sel })}
                  whileTap={{ scale: 0.95 }}
                  className="sheen heading-slam ml-auto inline-flex min-h-12 flex-1 -skew-x-12 items-center justify-center px-6 text-xl text-white disabled:opacity-60 sm:flex-none sm:text-2xl"
                  style={{
                    background: TEAM[me].c,
                    boxShadow: `5px 5px 0 0 ${TEAM[me].deep}`,
                  }}
                >
                  <span className="inline-flex skew-x-12 items-center gap-2">
                    {turn.kind === "ban" ? <Ban className="size-5" /> : <Swords className="size-5" />}
                    {t.draft.confirm(turn.kind, sel)}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {turn.kind === "choose" && turn.team === me && <ChoosePopup key="choose" me={me} busy={busy} onPick={(c) => act({ act: "choose", value: c })} />}
        </AnimatePresence>

        <AnimatePresence>
          {(err || offline) && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed left-1/2 top-20 z-50 inline-flex -translate-x-1/2 items-center gap-2 border border-rose bg-ink px-3 py-2 text-xs font-black uppercase tracking-wide text-rose-hi lg:top-24"
              role="status"
            >
              {offline ? (
                <>
                  <WifiOff className="size-3.5" /> {t.draft.offline} <Waiting />
                </>
              ) : (
                t.draft.error
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
