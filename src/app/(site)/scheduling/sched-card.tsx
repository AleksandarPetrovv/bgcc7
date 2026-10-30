"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, Repeat, X } from "lucide-react";
import { Countdown } from "@/components/site/countdown";
import { Modal } from "@/components/site/modal";
import { SlantButton } from "@/components/site/page";
import { useDict, useLang } from "@/components/site/lang";
import { fmtSofiaDay, fmtSofiaTime } from "@/lib/time";
import type { Proposal } from "@/lib/schedule";
import type { SchedMatch } from "@/db/schedule";
import { cn } from "@/lib/utils";
import { accept, propose, withdraw } from "./actions";

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

function Team({ s, flip }: { s: Side; flip?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", flip && "flex-row-reverse text-right")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {s.image ? <img src={s.image} alt="" className={cn("size-12 shrink-0 border-b-[3px] object-cover sm:size-14", flip ? "border-azure" : "border-crimson")} /> : <span className="size-12 shrink-0 bg-slate sm:size-14" />}
      <span className="line-clamp-2 min-w-0 break-words font-display font-black leading-tight sm:text-lg">{s.name}</span>
    </div>
  );
}

function Picker({ open, onClose, week, title, onSend }: { open: boolean; onClose: () => void; week: NonNullable<Week>; title: string; onSend: (v: string) => Promise<string | null> }) {
  const t = useDict();
  const [val, setVal] = useState(week.min);
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
          start(async () => setErr(await onSend(val)));
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
            className="w-full min-w-0 skew-x-12 border-0 bg-transparent px-4 text-base text-paper outline-none [color-scheme:light]"
          />
        </span>
        {err && <p className="text-sm font-bold text-rose-hi">{err}</p>}
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
  if (!list.length) return null;
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[0.7rem] font-display font-bold text-ash hover:text-paper sm:px-5">
        {t.sched.history} <span className="num">{list.length}</span>
      </summary>
      <ol className="grid gap-1.5 px-4 pb-4 sm:px-5">
        {list.map((p) => (
          <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
            <span className={cn("num", p.status === "rejected" || p.status === "cancelled" ? "text-ash line-through" : "text-paper")}>{w.full(p.at)}</span>
            <span className="text-xs text-ash">{team(p.teamId)}</span>
            <span className={cn("ml-auto text-[0.68rem] font-display font-bold", p.status === "accepted" ? "text-balkan-hi" : p.status === "pending" ? "text-gold-hi" : "text-rose-hi/80")}>{label(p)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

export function SchedCard({ m, round, me, opp, week, open }: { m: SchedMatch; round: string; me: Side; opp: Side; week: Week; open: boolean }) {
  const t = useDict();
  const w = useWhen();
  const router = useRouter();
  const [pick, setPick] = useState(false);
  const [warn, setWarn] = useState(false);
  const [wd, setWd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pend = m.history.find((p) => p.status === "pending");
  const theirs = pend && pend.teamId !== me.id;
  const agreed = m.startsAt;
  const msg = (e: string) => t.sched.err[e] ?? t.sched.err.failed;

  const send = async (v: string) => {
    const res = await propose(m.id, v).catch(() => ({ ok: false as const, error: "failed" as const }));
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

  const pull = () =>
    start(async () => {
      if (pending) return;
      const res = await withdraw(m.id).catch(() => ({ ok: false as const, error: "failed" as const }));
      setErr(res.ok ? null : msg(res.error));
      setWd(false);
      router.refresh();
    });

  return (
    <article className="in-up overflow-hidden border border-line bg-coal">
      <div className="flex items-center gap-3 border-b border-line bg-ink/60 px-4 py-2.5 sm:px-5">
        <span className="text-xs font-display font-bold text-rose-hi">{round}</span>
        {agreed && (
          <span className="ml-auto inline-flex items-center gap-1 text-[0.68rem] font-display font-bold text-balkan-hi">
            <Check className="size-3.5" strokeWidth={3} /> {t.sched.agreed}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-5 sm:gap-5 sm:px-5">
        <Team s={me} />
        <span className="heading-slam text-base text-ash">{t.common.vs}</span>
        <Team s={opp} flip />
      </div>

      <div className="border-t border-line px-4 py-5 text-center sm:px-5">
        <p className={cn("num", agreed ? "text-3xl text-paper sm:text-4xl" : "text-4xl text-ash sm:text-5xl")}>{agreed ? w.full(agreed) : t.common.tbd}</p>

        {!week ? (
          <p className="mt-4 text-sm text-ash">{t.sched.noWeek}</p>
        ) : !open ? (
          <p className="mt-4 text-sm font-bold text-ash">{t.sched.locked}</p>
        ) : agreed ? (
          <p className="mt-2 text-xs font-display font-bold text-ash/80">{t.sched.closes(w.short(week.deadline))}</p>
        ) : (
          <div className="relative mx-auto mt-5 max-w-xs pb-2">
            <p className="text-[0.7rem] font-display font-bold text-rose-hi">{t.sched.closesIn}</p>
            <Countdown to={week.deadline} />
            <p className="mt-1 text-sm text-paper/80">({w.full(week.deadline)})</p>
          </div>
        )}

        {week && open && pend && (
          <div className={cn("mx-auto mt-5 max-w-md border px-4 py-3", theirs ? "border-gold bg-gold/10" : "border-line")}>
            <p className="text-xs font-display font-bold text-ash">{theirs ? t.sched.proposed(opp.name) : t.sched.waitingOn(opp.name)}</p>
            <p className="num mt-1 text-2xl text-paper">{w.full(pend.at)}</p>
          </div>
        )}

        {week && open && (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {theirs ? (
              <>
                <SlantButton tone="balkan" onClick={yes} disabled={pending} className="px-6 py-2.5">
                  <Check className="size-4" /> {pending ? "…" : t.sched.accept}
                </SlantButton>
                <SlantButton tone="outline" onClick={() => setPick(true)} className="px-5 py-2.5">
                  <Repeat className="size-4" /> {t.sched.counter}
                </SlantButton>
              </>
            ) : agreed ? (
              <SlantButton tone="outline" onClick={() => setWarn(true)} className="px-5 py-2.5">
                <Repeat className="size-4" /> {t.sched.reschedule}
              </SlantButton>
            ) : (
              <SlantButton onClick={() => setPick(true)} className="px-6 py-2.5">
                <CalendarClock className="size-4" /> {t.sched.propose}
              </SlantButton>
            )}
            {!theirs && pend && (
              <SlantButton tone="outline" onClick={pull} disabled={pending} className="px-5 py-2.5">
                <X className="size-4" /> {t.sched.withdraw}
              </SlantButton>
            )}
            {agreed && !pend && (
              <SlantButton tone="outline" onClick={() => setWd(true)} disabled={pending} className="px-5 py-2.5">
                <X className="size-4" /> {t.sched.withdraw}
              </SlantButton>
            )}
          </div>
        )}
        {err && <p className="mt-3 text-sm font-bold text-rose-hi">{err}</p>}
      </div>

      <History list={m.history} me={me} opp={opp} />

      {week && (
        <Picker key={String(pick)} open={pick} onClose={() => setPick(false)} week={week} title={theirs ? t.sched.counter : agreed ? t.sched.reschedule : t.sched.propose} onSend={send} />
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
      <Modal open={wd} onClose={() => !pending && setWd(false)} tone="gold">
        <AlertTriangle className="size-7 text-gold-hi" />
        <h3 className="heading-slam mt-2 pr-6 text-2xl">{t.sched.withdrawTitle}</h3>
        <p className="mt-2 text-sm text-paper/85">{t.sched.withdrawText}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <SlantButton onClick={pull} disabled={pending} className="px-6 py-2.5">
            {pending ? "…" : t.sched.withdraw}
          </SlantButton>
          <SlantButton tone="outline" onClick={() => setWd(false)} className="px-5 py-2.5">
            {t.sched.cancel}
          </SlantButton>
        </div>
      </Modal>
    </article>
  );
}
