"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn, ErrorNote } from "@/components/admin/form";
import { PhaseWarningList, usePhaseWarnings } from "@/components/site/phase-prompt";
import { Popup, PopupTitle } from "@/components/site/popup";
import { SlantBg } from "@/components/site/slant";
import { TabMark } from "@/components/site/tabs";
import { useDict } from "@/components/site/lang";
import { acceptPhase } from "@/actions/phase";
import { errorText } from "@/lib/action-result";
import { PHASES, type Phase } from "@/lib/sections";
import { cn, cssVars } from "@/lib/utils";

type Ask = { to: Phase; n: number };

const at = (i: number) => cssVars({ "--i": i });

function PhaseConfirm({ ask, open, pending, error, onYes, onClose }: { ask: Ask | null; open: boolean; pending: boolean; error: string | null; onYes: () => void; onClose: () => void }) {
  const t = useDict();
  const sw = t.admin.phaseSwitch;
  const list = usePhaseWarnings(ask?.to ?? null, ask?.n);
  const name = ask ? t.admin.phases[ask.to] : "";
  return (
    <Popup open={open} onClose={() => !pending && onClose()} shadow={6} className="max-w-lg p-5 sm:p-7">
      <div style={cssVars({ "--s": "0.06s", "--d": "0.1s" })}>
        <PopupTitle className="heading-slam in-up break-words pr-8 text-2xl sm:text-3xl" style={at(0)}>
          {sw.title(name)}
        </PopupTitle>
        <p className="in-up mt-1 text-sm text-ash" style={at(1)}>
          {list === null ? sw.checking : list.length ? sw.lead : sw.ready(name)}
        </p>
        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", list?.length ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="pt-4">{ask && list && <PhaseWarningList list={list} to={ask.to} />}</div>
          </div>
        </div>
        <div className="in-up mt-5 flex flex-wrap items-center gap-3" style={at(3)}>
          <Btn type="button" disabled={list === null || pending} onClick={onYes}>
            {pending ? t.admin.saving : t.admin.prompt.yes(name)}
          </Btn>
          <Btn type="button" tone="outline" disabled={pending} onClick={onClose}>
            {t.sched.cancel}
          </Btn>
          {error && !pending && <ErrorNote>{error}</ErrorNote>}
        </div>
      </div>
    </Popup>
  );
}

export function PhasePicker({ phase }: { phase: Phase }) {
  const t = useDict();
  const router = useRouter();
  const mark = useId();
  const [seen, setSeen] = useState(phase);
  const [cur, setCur] = useState(phase);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // another staff member (or a refresh) moved the phase: follow the server
  if (phase !== seen) {
    setSeen(phase);
    setCur(phase);
  }

  const pick = (to: Phase) => {
    setError(null);
    setAsk((a) => ({ to, n: (a?.n ?? 0) + 1 }));
    setOpen(true);
  };
  const confirm = () =>
    ask &&
    start(async () => {
      setError(null);
      try {
        const res = await acceptPhase(ask.to);
        if (!res?.ok) return setError(errorText(t, res?.error));
        setCur(ask.to);
        setOpen(false);
        router.refresh();
      } catch {
        setError(t.admin.error);
      }
    });

  return (
    <>
      <div role="radiogroup" aria-label={t.admin.phaseNow} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {PHASES.map((p, i) => {
          const on = p === cur;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && pick(p)}
              style={cssVars({ "--i": i, "--s": "0.06s", "--d": "0.55s" })}
              className={cn(
                "in-up group/ph relative isolate flex min-h-16 flex-col justify-center gap-0.5 px-5 py-2.5 text-left font-display font-bold outline-none transition-colors duration-200",
                on ? "cursor-default text-paper" : "text-paper/70 hover:text-paper focus-visible:text-paper",
              )}
            >
              <SlantBg className="-skew-x-6 border border-line transition-[border-color,background-color,box-shadow] duration-200 group-hover/ph:border-paper/40 group-focus-visible/ph:border-rose group-aria-checked/ph:border-rose group-aria-checked/ph:bg-rose/10 group-aria-checked/ph:shadow-[4px_4px_0_0_var(--rose-deep)]" />
              <TabMark id={mark} active={on} className="inset-x-4 bottom-2" />
              <span className="flex items-center gap-2 text-[0.7rem] leading-none">
                <span className={cn("num transition-colors duration-200", on ? "text-rose-hi" : "text-ash")}>{i + 1}</span>
                <span aria-hidden={!on} className={cn("text-rose-hi transition-opacity duration-300", on ? "opacity-100" : "opacity-0")}>
                  {t.admin.current}
                </span>
              </span>
              <span className="text-sm leading-tight">{t.admin.phases[p]}</span>
            </button>
          );
        })}
      </div>
      <PhaseConfirm ask={ask} open={open} pending={pending} error={error} onYes={confirm} onClose={() => setOpen(false)} />
    </>
  );
}
