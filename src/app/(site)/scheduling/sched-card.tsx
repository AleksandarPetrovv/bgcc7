"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, ChevronDown, Repeat, X } from "lucide-react";
import { Countdown } from "@/components/site/countdown";
import { Modal } from "@/components/site/modal";
import { SlantButton } from "@/components/site/page";
import { useDict, useLang } from "@/components/site/lang";
import { fmtSofiaDay, fmtSofiaTime } from "@/lib/time";
import type { Proposal } from "@/lib/schedule";
import type { SchedMatch } from "@/db/schedule";
import { cn } from "@/lib/utils";
import { at, Letters } from "@/components/site/rich";
import { belowFold } from "@/components/site/in-view";
import { RuleDiamond } from "@/components/site/rule";
import { AnimatePresence, motion } from "motion/react";
import { EASE } from "@/components/site/motion";
import { accept, decline, propose, withdraw } from "./actions";

const reveal = { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.4, ease: EASE } };
const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25, ease: EASE } };

export type Side = { id: string; name: string; image: string; players: number[] };
type Week = { deadline: string; min: string; max: string } | null;

function useWhen() {
  const lang = useLang();
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  return {
    full: (iso: string) => `${fmtSofiaDay(new Date(iso), locale)} · ${fmtSofiaTime(new Date(iso))}`,
    short: (iso: string) => `${new Date(iso).toLocaleDateString(locale, { timeZone: "Europe/Sofia", weekday: "short" })} ${fmtSofiaTime(new Date(iso))}`,
  };
}

function Team({ s, flip, d }: { s: Side; flip?: boolean; d: number }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left", flip && "sm:flex-row-reverse sm:text-right")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {s.image ? <img src={s.image} alt="" className={cn("size-12 shrink-0 border-b-[3px] object-cover sm:size-14", flip ? "border-azure" : "border-crimson")} /> : <span className="size-12 shrink-0 bg-slate sm:size-14" />}
      <span className="line-clamp-2 min-w-0 break-words font-display font-black leading-tight sm:text-lg"><Letters text={s.name} d={d} s={0.02} /></span>
    </div>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useDict();
  return (
    <label className="grid gap-1.5 text-xs font-display font-bold text-ash">
      {t.sched.note}
      <span className="flex w-full min-w-0 -skew-x-6 border border-line bg-ink focus-within:border-rose">
        <textarea
          required
          rows={2}
          maxLength={300}
          value={value}
          placeholder={t.sched.notePh}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 skew-x-6 resize-none border-0 bg-transparent px-4 py-2.5 font-sans text-sm font-normal text-paper outline-none placeholder:text-ash/70"
        />
      </span>
    </label>
  );
}

function ErrLine({ err }: { err: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {err && (
        <motion.p key={err} {...reveal} className="overflow-hidden text-sm font-bold text-rose-hi">
          {err}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// confirm popup for withdrawing or declining; the note is required
function NoteModal({ open, onClose, title, text, action, onSend }: { open: boolean; onClose: () => void; title: string; text: string; action: string; onSend: (note: string) => Promise<string | null> }) {
  const t = useDict();
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Modal open={open} onClose={() => !pending && onClose()} tone="gold">
      <AlertTriangle className="size-7 text-gold-hi" />
      <h3 className="heading-slam mt-2 pr-6 text-2xl">{title}</h3>
      <p className="mt-2 text-sm text-paper/85">{text}</p>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return setErr(t.sched.err.note);
          start(async () => setErr(await onSend(note)));
        }}
      >
        <NoteField value={note} onChange={setNote} />
        <ErrLine err={err} />
        <div className="flex flex-wrap gap-3">
          <SlantButton type="submit" disabled={pending} className="px-6 py-2.5">
            {pending ? "…" : action}
          </SlantButton>
          <SlantButton tone="outline" onClick={onClose} className="px-5 py-2.5">
            {t.sched.cancel}
          </SlantButton>
        </div>
      </form>
    </Modal>
  );
}

function Picker({ open, onClose, week, title, onSend }: { open: boolean; onClose: () => void; week: NonNullable<Week>; title: string; onSend: (v: string, note: string) => Promise<string | null> }) {
  const t = useDict();
  const [val, setVal] = useState(week.min);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Modal open={open} onClose={() => !pending && onClose()}>
      <h3 className="heading-slam pr-6 text-2xl">{title}</h3>
      <p className="mt-1 text-xs font-display font-bold text-ash">{t.sched.window}</p>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return setErr(t.sched.err.note);
          start(async () => setErr(await onSend(val, note)));
        }}
      >
        <span className="flex min-h-11 w-full min-w-0 -skew-x-12 border border-line bg-ink focus-within:border-rose">
          <input
            type="datetime-local"
            required
            value={val}
            min={week.min}
            max={week.max}
            step={300}
            onChange={(e) => setVal(e.target.value)}
            className="num w-full min-w-0 skew-x-12 border-0 bg-transparent px-4 text-base text-paper outline-none [color-scheme:light] [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-datetime-edit-text]:px-px"
          />
        </span>
        <NoteField value={note} onChange={setNote} />
        <ErrLine err={err} />
        <div className="flex flex-wrap gap-3">
          <SlantButton type="submit" disabled={pending} className="px-6 py-2.5">
            {pending ? "…" : t.sched.send}
          </SlantButton>
          <SlantButton tone="outline" onClick={onClose} className="px-5 py-2.5">
            {t.sched.cancel}
          </SlantButton>
        </div>
      </form>
    </Modal>
  );
}

function History({ list, me, opp }: { list: Proposal[]; me: Side; opp: Side }) {
  const t = useDict();
  const w = useWhen();
  const st = t.sched.st;
  const team = (id: string) => (id === me.id ? me.name : opp.name);
  const other = (id: string) => (id === me.id ? opp.name : me.name);
  const of = (osu: number | null) => (osu == null ? "" : me.players.includes(osu) ? me.name : opp.name);
  const label = (p: Proposal) =>
    p.status === "rejected" ? st.rejected(other(p.teamId)) : p.status === "cancelled" ? (p.staff || p.answeredBy == null ? st.staff : st.cancelled(of(p.answeredBy))) : p.status === "staff" ? st.set : st[p.status];
  const [open, setOpen] = useState(true);
  if (!list.length) return null;
  return (
    <div className="border-t border-line">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={at(1.5)} className="in-up in-slow flex items-center gap-2 py-3 text-[0.7rem] font-display font-bold text-ash hover:text-paper">
        {t.sched.history} <ChevronDown className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...reveal} className="overflow-hidden">
            <ol className="grid gap-1.5 pb-4">
              <AnimatePresence initial={false}>
                {list.map((p, k) => (
                  <motion.li
                    key={p.id}
                    layout="position"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    style={at(1.6, k, 0.08)}
                    className="in-left in-slow flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm"
                  >
                    <span className={cn("num transition-colors duration-500", p.status === "rejected" || p.status === "cancelled" ? "text-ash line-through" : "text-paper")}>{w.full(p.at)}</span>
                    <span className="font-display text-sm font-bold text-ash">{team(p.teamId)}</span>
                    <span className={cn("ml-auto text-[0.68rem] font-display font-bold transition-colors duration-500", p.status === "accepted" ? "text-balkan-hi" : p.status === "pending" ? "text-gold-hi" : "text-rose-hi/80")}>{label(p)}</span>
                    {p.note && <span className="basis-full text-xs italic text-ash">“{p.note}”</span>}
                    {p.reply && <span className="basis-full text-xs italic text-rose-hi/80">↳ “{p.reply}”</span>}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SchedCard({ m, round, me, opp, week, open, readOnly = false, n = 0 }: { m: SchedMatch; round: string; me: Side; opp: Side; week: Week; open: boolean; readOnly?: boolean; n?: number }) {
  const t = useDict();
  const ref = useRef<HTMLElement>(null);
  // once the intro is over, parts that mount later (after a refresh) appear without the long delays
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (ref.current && belowFold(ref.current)) return setSettled(true);
    const id = setTimeout(() => setSettled(true), 4000 + n * 220);
    return () => clearTimeout(id);
  }, [n]);
  const w = useWhen();
  const router = useRouter();
  const [pick, setPickState] = useState(false);
  // new key per open resets the form; same key while closing keeps the exit animation
  const [pickKey, setPickKey] = useState(0);
  const setPick = (v: boolean) => {
    if (v) setPickKey((k) => k + 1);
    setPickState(v);
  };
  const [warn, setWarn] = useState(false);
  // which note popup is up: withdraw my proposal, clear the agreed time, or decline theirs
  const [ask, setAskState] = useState<"pull" | "clear" | "decline" | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askKey, setAskKey] = useState(0);
  const setAsk = (v: "pull" | "clear" | "decline" | null) => {
    if (v) {
      setAskKey((k) => k + 1);
      setAskState(v);
    }
    setAskOpen(!!v);
  };
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pend = m.history.find((p) => p.status === "pending");
  const theirs = pend && pend.teamId !== me.id;
  const agreed = m.startsAt;
  const msg = (e: string) => t.sched.err[e] ?? t.sched.err.failed;

  const send = async (v: string, note: string) => {
    const res = await propose(m.id, v, note).catch(() => ({ ok: false as const, error: "failed" as const }));
    if (!res.ok) return msg(res.error);
    setPick(false);
    router.refresh();
    return null;
  };
  const yes = () =>
    start(async () => {
      if (!pend || pending) return;
      const res = await accept(m.id, pend.id).catch(() => ({ ok: false as const, error: "failed" as const }));
      setErr(res.ok ? null : msg(res.error));
      router.refresh();
    });

  const answer = async (note: string) => {
    const res = await (ask === "decline" && pend ? decline(m.id, pend.id, note) : withdraw(m.id, note)).catch(() => ({ ok: false as const, error: "failed" as const }));
    if (!res.ok) return msg(res.error);
    setAsk(null);
    router.refresh();
    return null;
  };

  const L = n * 0.15;
  return (
    <article
      ref={ref}
      className={cn("in-up in-slow relative border-b-2 border-dashed border-line", settled && "no-intro")}
      style={{ "--d": "0s", "--i": n, "--s": "0.15s", "--cd": `${n * 0.15}s` } as React.CSSProperties}
    >
      <RuleDiamond />
      <div style={at(0.15)} className="in-up in-slow flex items-center gap-3 border-b border-line pb-2.5">
        <span className="size-2 shrink-0 rotate-45 bg-rose" aria-hidden />
        <Letters text={round} d={L} className="text-xs font-display font-bold text-rose-hi" />
        <AnimatePresence initial={false}>
          {agreed && (
            <motion.span key="ok" {...fade} className="ml-auto inline-flex items-center gap-1 text-[0.68rem] font-display font-bold text-balkan-hi">
              <Check className="size-3.5" strokeWidth={3} /> {t.sched.agreed}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-5 sm:gap-5">
        <div style={at(0.3)} className="in-left-far in-slow min-w-0">
          <Team s={me} d={L} />
        </div>
        <span style={at(0.65)} className="in-slam heading-slam text-base text-ash">{t.common.vs}</span>
        <div style={at(0.3)} className="in-right-far in-slow min-w-0">
          <Team s={opp} flip d={L} />
        </div>
      </div>

      <div className="border-t border-line py-5 text-center">
        <AnimatePresence initial={false} mode="wait">
          <motion.p key={agreed ?? "tbd"} {...fade} className={cn("num text-paper", agreed ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl")}><Letters text={agreed ? w.full(agreed) : t.common.tbd} d={L} s={0.02} /></motion.p>
        </AnimatePresence>

        {!week ? (
          <p className="mt-4 text-sm font-display font-bold text-ash"><Letters text={t.sched.noWeek} d={L} s={0.01} /></p>
        ) : !open ? (
          <p className="mt-4 text-sm font-display font-bold text-ash"><Letters text={t.sched.locked} d={L} s={0.01} /></p>
        ) : agreed ? (
          <p className="mt-2 text-xs font-display font-bold text-ash"><Letters text={t.sched.closes(w.short(week.deadline))} d={L} s={0.01} /></p>
        ) : (
          <div className="relative mx-auto mt-5 max-w-sm pb-2">
            <p className="text-xs font-display font-bold text-ash"><Letters text={t.sched.closesIn} d={L} s={0.015} /></p>
            <div style={at(0.1)} className="in-up mt-1 flex justify-center">
              <Countdown to={week.deadline} className="text-3xl max-sm:text-3xl" />
            </div>
            <p className="mt-4 text-xs font-display font-bold text-ash"><Letters text={w.full(week.deadline)} d={L} s={0.01} /></p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {week && open && pend && (
            <motion.div key={pend.id} {...reveal} className="overflow-hidden">
              <div style={at(1.1)} className={cn("in-up in-slow mx-auto mt-5 max-w-md border px-4 py-3 transition-colors duration-500", theirs ? "border-gold bg-gold/10" : "border-line")}>
                <p className="text-xs font-display font-bold text-ash">{theirs ? t.sched.proposed(opp.name) : t.sched.waitingOn(opp.name)}</p>
                <p className="num mt-1 text-2xl text-paper">{w.full(pend.at)}</p>
                {pend.note && <p className="mt-1.5 text-sm italic text-paper/80">“{pend.note}”</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {week && open && !readOnly && (
          <AnimatePresence initial={false} mode="wait">
          <motion.div key={theirs ? "t" : agreed ? (pend ? "ap" : "a") : pend ? "p" : "n"} {...fade} className="mt-5 flex flex-wrap justify-center gap-3">
            {theirs ? (
              <>
                <span className="in-up in-slow inline-flex" style={at(1.25, 0, 0.1)}>
                  <SlantButton tone="balkan" onClick={yes} disabled={pending} className="px-6 py-2.5">
                    <Check className="size-4" /> {pending ? "…" : t.sched.accept}
                  </SlantButton>
                </span>
                <span className="in-up in-slow inline-flex" style={at(1.25, 1, 0.1)}>
                  <SlantButton tone="outline" onClick={() => setPick(true)} className="px-5 py-2.5">
                    <Repeat className="size-4" /> {t.sched.counter}
                  </SlantButton>
                </span>
                <span className="in-up in-slow inline-flex" style={at(1.25, 2, 0.1)}>
                  <SlantButton tone="outline" onClick={() => setAsk("decline")} disabled={pending} className="px-5 py-2.5">
                    <X className="size-4" /> {t.sched.decline}
                  </SlantButton>
                </span>
              </>
            ) : agreed ? (
              <span className="in-up in-slow inline-flex" style={at(1.25, 0, 0.1)}>
                <SlantButton tone="outline" onClick={() => setWarn(true)} className="px-5 py-2.5">
                  <Repeat className="size-4" /> {t.sched.reschedule}
                </SlantButton>
              </span>
            ) : (
              <span className="in-up in-slow inline-flex" style={at(1.25, 0, 0.1)}>
                <SlantButton onClick={() => setPick(true)} className="px-6 py-2.5">
                  <CalendarClock className="size-4" /> {t.sched.propose}
                </SlantButton>
              </span>
            )}
            {!theirs && pend && (
              <span className="in-up in-slow inline-flex" style={at(1.25, 1, 0.1)}>
                <SlantButton tone="outline" onClick={() => setAsk("pull")} disabled={pending} className="px-5 py-2.5">
                  <X className="size-4" /> {t.sched.withdraw}
                </SlantButton>
              </span>
            )}
            {agreed && !pend && (
              <span className="in-up in-slow inline-flex" style={at(1.25, 1, 0.1)}>
                <SlantButton tone="outline" onClick={() => setAsk("clear")} disabled={pending} className="px-5 py-2.5">
                  <X className="size-4" /> {t.sched.withdraw}
                </SlantButton>
              </span>
            )}
          </motion.div>
          </AnimatePresence>
        )}
        <AnimatePresence initial={false}>
          {err && (
            <motion.p key={err} {...reveal} className="overflow-hidden text-sm font-bold text-rose-hi">
              <span className="block pt-3">{err}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <History list={m.history} me={me} opp={opp} />

      {week && (
        <Picker key={pickKey} open={pick} onClose={() => setPick(false)} week={week} title={theirs ? t.sched.counter : agreed ? t.sched.reschedule : t.sched.propose} onSend={send} />
      )}
      <Modal open={warn} onClose={() => setWarn(false)} tone="gold">
        <AlertTriangle className="size-7 text-gold-hi" />
        <h3 className="heading-slam mt-2 pr-6 text-2xl">{t.sched.warnTitle}</h3>
        <p className="mt-2 text-sm text-paper/85">{t.sched.warnText}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <SlantButton
            onClick={() => {
              setWarn(false);
              setPick(true);
            }}
            className="px-6 py-2.5"
          >
            {t.sched.reschedule}
          </SlantButton>
          <SlantButton tone="outline" onClick={() => setWarn(false)} className="px-5 py-2.5">
            {t.sched.cancel}
          </SlantButton>
        </div>
      </Modal>
      <NoteModal
        key={askKey}
        open={askOpen}
        onClose={() => setAsk(null)}
        title={ask === "decline" ? t.sched.declineTitle : ask === "pull" ? t.sched.pullTitle : t.sched.withdrawTitle}
        text={ask === "decline" ? t.sched.declineText : ask === "pull" ? t.sched.pullText : t.sched.withdrawText}
        action={ask === "decline" ? t.sched.decline : t.sched.withdraw}
        onSend={answer}
      />
    </article>
  );
}
