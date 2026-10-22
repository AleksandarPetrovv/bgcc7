"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Ban, Check, Copy, Crown, DoorClosed, ListOrdered, Pause, RotateCcw, Swords } from "lucide-react";
import { useDict } from "@/components/site/lang";
import type { Beatmap } from "@/lib/data";
import type { Side } from "@/lib/draft";
import { cn } from "@/lib/utils";
import { slotColor } from "@/lib/format-plan";
import { GOLD, modHi, TEAM, tint } from "@/lib/theme";
import { Costs, MapCard } from "@/components/site/match-dialog";
import type { MapResult, Scoreboard } from "@/lib/scoreboard";

const noop = () => () => {};

const POP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} as const;

export function Portal({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return ready ? createPortal(children, document.body) : null;
}

export function ChoosePopup({ me, busy, onPick }: { me: Side; busy: boolean; onPick: (c: "pick" | "ban") => void }) {
  const t = useDict();
  const [choice, setChoice] = useState<"pick" | "ban" | null>(null);
  const col = TEAM[me];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.15 } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
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
        <Crown className="size-10 fill-current text-gold-hi" />
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
                  "group relative flex -skew-x-6 cursor-pointer select-none flex-col items-center gap-2 border-2 px-3 py-6 font-display font-bold transition-[transform,color,border-color,translate,scale,rotate] duration-200 active:scale-95",
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
          className={cn("sheen heading-slam mt-5 flex min-h-14 w-full -skew-x-12 items-center justify-center text-2xl transition-[transform,opacity,filter,translate,scale,rotate] duration-200 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50", choice ? "text-white" : "text-ash")}
          style={{
            background: choice ? col.c : "var(--slate)",
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

export function TimerDock({
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
  const tone = pause ? GOLD : low ? { c: TEAM[1].c, hi: TEAM[1].hi, deep: TEAM[1].deep } : color;
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
            <span className="flex items-center gap-1.5 text-[0.65rem] font-display font-bold" style={{ color: hi }}>
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
            className="num shrink-0 text-5xl font-display font-black tabular-nums leading-none sm:text-6xl"
            style={{ color: low || pause ? hi : "var(--paper)", textShadow: `0 0 24px ${tint(c, 40)}` }}
          >
            {clockText(left)}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function WinnerPopup({
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
  onPick: (w: Side) => Promise<boolean>;
  onClose: () => void;
  onScores?: () => void;
}) {
  const t = useDict();
  const [busy, setBusy] = useState<Side | null>(null);
  const saving = useRef(false);
  const color = slotColor(slot);
  async function pick(side: Side) {
    if (saving.current) return;
    saving.current = true;
    setBusy(side);
    try {
      await onPick(side);
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
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
          <Crown className="mx-auto size-9 fill-current text-gold-hi" />
          <h3 className="heading-slam mt-2 text-4xl sm:text-5xl">{t.draft.whoWon}</h3>
          <p className="mt-1 truncate text-sm font-display font-bold text-ash">
            <span style={{ color: modHi(color) }}>{slot}</span> · {map.title}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            {([1, 2] as const).map((s) => (
              <motion.button
                key={s}
                type="button"
                disabled={busy != null}
                onClick={() => pick(s)}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.1 }}
                className={cn(
                  "group relative flex min-h-28 flex-col items-center justify-center gap-2 overflow-hidden px-3 text-white disabled:opacity-60",
                  "-skew-x-6",
                )}
                style={{
                  background: `linear-gradient(${s === 1 ? "135deg" : "225deg"}, ${TEAM[s].c}, ${TEAM[s].deep})`,
                  boxShadow: current === s ? `0 0 0 3px var(--paper), 5px 5px 0 0 ${TEAM[s].deep}` : `5px 5px 0 0 ${TEAM[s].deep}`,
                }}
              >
                <span className="pointer-events-none absolute -right-4 -top-4 size-16 rotate-45 bg-white/10 transition-transform duration-300 group-hover:scale-150" aria-hidden />
                <span className={cn("relative flex max-w-full flex-col items-center gap-1", "skew-x-6")}>
                  <span className="text-[0.65rem] font-display font-bold text-white/70">{s === 1 ? t.draft.red : t.draft.blue}</span>
                  <span className="line-clamp-2 max-w-full break-words text-sm font-display font-black leading-tight sm:text-base">{teams[s - 1]}</span>
                  {busy === s && <Waiting />}
                </span>
              </motion.button>
            ))}
          </div>
          {onScores && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => { if (!saving.current) onScores(); }}
              className="mt-5 inline-flex min-h-9 -skew-x-12 items-center border border-paper/40 px-4 text-xs font-display font-bold text-paper transition-colors hover:border-paper disabled:opacity-50"
            >
              <span className="inline-flex skew-x-12 items-center gap-1.5">
                <ListOrdered className="size-3.5" /> {t.draft.fullScores}
              </span>
            </button>
          )}
          <button type="button" disabled={busy != null} onClick={() => { if (!saving.current) onClose(); }} className="mt-5 block w-full text-xs font-display font-bold text-ash hover:text-paper disabled:opacity-50">
            {t.draft.later}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ScoresPopup({ slug, slot, names, onClose }: { slug: string; slot: string; names: [string, string]; onClose: () => void }) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
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
        <button type="button" onClick={onClose} className="mt-3 block w-full text-xs font-display font-bold text-ash hover:text-paper">
          {t.draft.close}
        </button>
      </motion.div>
    </motion.div>
  );
}

export function ResetPopup({ lobby, busy, onCancel, onReset }: { lobby: boolean; busy: boolean; onCancel: () => void; onReset: (close: boolean) => void }) {
  const t = useDict();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden border-2 border-rose bg-coal p-6 shadow-[8px_8px_0_0_var(--rose-deep)]"
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
              className="flex min-h-12 -skew-x-6 items-center bg-rose px-5 text-left font-display font-bold text-white shadow-[5px_5px_0_0_var(--rose-deep)] disabled:opacity-60"
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
              "flex min-h-12 -skew-x-6 items-center px-5 text-left font-display font-bold disabled:opacity-60",
              lobby ? "border border-rose text-rose-hi hover:bg-rose/10" : "bg-rose text-white shadow-[5px_5px_0_0_var(--rose-deep)]",
            )}
          >
            <span className="inline-flex skew-x-6 items-center gap-2">
              <RotateCcw className="size-4" /> {lobby ? t.draft.resetKeep : t.draft.reset}
            </span>
          </motion.button>
          <button type="button" onClick={onCancel} className="mt-1 text-xs font-display font-bold text-ash hover:text-paper">
            {t.draft.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CopyId({ id }: { id: number }) {
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
    <span className="num mt-1 flex items-center gap-1.5 text-sm font-display font-bold text-paper/75">
      ID <span className="select-all text-paper">{id}</span>
      <span
        role="button"
        tabIndex={0}
        title="Copy"
        onClick={copy}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && copy(e)}
        className="inline-flex size-6 cursor-pointer items-center justify-center border border-line text-ash transition-colors hover:border-paper hover:text-paper"
      >
        {done ? <Check className="size-3.5 text-balkan-hi" strokeWidth={3} /> : <Copy className="size-3.5" />}
      </span>
    </span>
  );
}

export function Waiting() {
  return (
    <span className="dr-dots inline-flex gap-1" aria-hidden>
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
}
