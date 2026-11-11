"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Btn, ErrorNote, Field } from "@/components/admin/form";
import { Popup, PopupTitle } from "@/components/site/popup";
import { useDict } from "@/components/site/lang";
import { SlantBg } from "@/components/site/slant";
import { errorText, type ActionError, type ActionResult } from "@/lib/action-result";
import { EASE } from "@/lib/ease";
import { OUT_KINDS, isOutKind, type OutKind } from "@/lib/out";
import { cn } from "@/lib/utils";
import { disableTeam, enableTeam, undoForfeit } from "./actions";

function Choice({ value, options, onChange, className }: { value: string | null; options: [string, string][]; onChange: (v: string) => void; className?: string }) {
  return (
    <div role="radiogroup" className={cn("grid grid-cols-1 gap-2", className)}>
      {options.map(([v, label], i) => (
        <label
          key={v}
          style={{ "--i": i, "--s": "0.06s", "--d": "0.2s" } as React.CSSProperties}
          className="in-left group/ch relative isolate flex min-h-12 cursor-pointer items-center justify-center px-4 text-center text-sm font-display font-bold"
        >
          <SlantBg className="-skew-x-6 border border-line transition-colors group-hover/ch:border-paper/40 group-has-[:checked]/ch:border-rose group-has-[:checked]/ch:bg-rose/10 group-has-[:checked]/ch:shadow-[4px_4px_0_0_var(--rose-deep)] group-has-[:focus-visible]/ch:ring-2 group-has-[:focus-visible]/ch:ring-rose" />
          <input type="radio" name="choice" value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}

const stagger = { "--s": "0.06s", "--d": "0.1s" } as React.CSSProperties;
const at = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** Disable / Enable for one team: the kind popup, then (forfeit before a winners bracket match) the scope popup. `forfeit`: a team still in that gave one match up (next = not played yet) */
export function TeamOut({ id, name, out, askOnce, forfeit }: { id: string; name: string; out: OutKind | null; askOnce: boolean; forfeit: "next" | "done" | null }) {
  const t = useDict();
  const to = t.admin.teamOut;
  const router = useRouter();
  const [step, setStep] = useState<"kind" | "scope" | null>(null);
  const [kind, setKind] = useState<OutKind | null>(null);
  const [reason, setReason] = useState("");
  const [once, setOnce] = useState<boolean | null>(null);
  const [fail, setFail] = useState<{ error?: ActionError; back?: boolean } | null>(null);
  const [pending, start] = useTransition();

  // `back`: taking a team or a forfeit back, which "invalid" refuses once the bracket moved on
  const run = (fn: () => Promise<ActionResult>, done?: () => void, back = false) =>
    start(async () => {
      setFail(null);
      try {
        const res = await fn();
        if (res?.ok) {
          done?.();
          router.refresh();
        } else setFail({ error: res?.error, back });
      } catch {
        setFail({});
      }
    });

  const needsReason = kind === "dq" || kind === "other";
  const ready = kind !== null && (!needsReason || reason.trim() !== "");
  const send = (k: OutKind, single: boolean) => run(() => disableTeam(id, k, k === "forfeit" ? "" : reason, single), () => setStep(null));
  const confirm = () => {
    if (!kind || !ready) return;
    if (kind === "forfeit" && askOnce) {
      setFail(null);
      setStep("scope");
    } else send(kind, false);
  };
  const begin = () => {
    setKind(null);
    setReason("");
    setOnce(null);
    setFail(null);
    setStep("kind");
  };
  const close = () => !pending && setStep(null);
  const msg = fail && (fail.back && fail.error === "invalid" ? to.stale : errorText(t, fail.error));

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {!out && forfeit && <span className="in-left text-xs font-display font-bold text-rose-hi/70 [--d:0s]">{forfeit === "next" ? to.forfeitsNext : to.forfeitedOne}</span>}
        {out ? (
          <Btn type="button" tone="outline" small disabled={pending} onClick={() => run(() => enableTeam(id), undefined, true)}>
            {pending ? t.admin.saving : to.enable}
          </Btn>
        ) : (
          <>
            {forfeit && (
              <Btn type="button" tone="outline" small disabled={pending} onClick={() => run(() => undoForfeit(id), undefined, true)}>
                {pending ? t.admin.saving : to.undo}
              </Btn>
            )}
            <Btn type="button" tone="danger" small onClick={begin}>
              {to.disable}
            </Btn>
          </>
        )}
        {msg && !pending && !step && <ErrorNote>{msg}</ErrorNote>}
      </div>

      <Popup open={step === "kind"} onClose={close} shadow={6} className="max-w-2xl p-5 sm:p-7">
        <form
          style={stagger}
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <PopupTitle className="heading-slam in-up break-words pr-8 text-2xl sm:text-3xl" style={at(0)}>
            {to.title(name)}
          </PopupTitle>
          <p className="in-up mt-1 text-sm text-ash" style={at(1)}>
            {to.text}
          </p>
          <Choice className="mt-5 sm:grid-cols-3" value={kind} options={OUT_KINDS.map((k) => [k, to[k]])} onChange={(v) => isOutKind(v) && setKind(v)} />
          <AnimatePresence initial={false}>
            {needsReason && (
              <motion.div key="reason" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="-mx-2 overflow-hidden px-2">
                <div className="pb-2 pt-4">
                  <Field name="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={to.reasonPlaceholder} aria-label={to.reason} className="w-full" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="in-up mt-5 flex flex-wrap items-center gap-3" style={at(3)}>
            <Btn type="submit" disabled={!ready || pending}>
              {pending ? t.admin.saving : to.confirm}
            </Btn>
            <Btn type="button" tone="outline" onClick={close}>
              {t.sched.cancel}
            </Btn>
            {msg && !pending && <ErrorNote>{msg}</ErrorNote>}
          </div>
        </form>
      </Popup>

      <Popup open={step === "scope"} onClose={close} shadow={6} className="max-w-xl p-5 sm:p-7">
        <div style={stagger}>
          <PopupTitle className="heading-slam in-up break-words pr-8 text-2xl sm:text-3xl" style={at(0)}>
            {to.scopeTitle}
          </PopupTitle>
          <p className="in-up mt-1 text-sm text-ash" style={at(1)}>
            {to.scopeText}
          </p>
          <Choice
            className="mt-5 sm:grid-cols-2"
            value={once === null ? null : once ? "once" : "permanent"}
            options={[
              ["once", to.once],
              ["permanent", to.permanent],
            ]}
            onChange={(v) => setOnce(v === "once")}
          />
          <div className="in-up mt-5 flex flex-wrap items-center gap-3" style={at(3)}>
            <Btn type="button" disabled={once === null || pending} onClick={() => once !== null && send("forfeit", once)}>
              {pending ? t.admin.saving : to.forfeit}
            </Btn>
            <Btn type="button" tone="outline" onClick={close}>
              {t.sched.cancel}
            </Btn>
            {msg && !pending && <ErrorNote>{msg}</ErrorNote>}
          </div>
        </div>
      </Popup>
    </>
  );
}
