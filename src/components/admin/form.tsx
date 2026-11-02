"use client";

import { createContext, useActionState, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { Flash } from "./flash";
import { Modal } from "@/components/site/modal";
import { Sparkle } from "@/components/site/graphics";
import { useDict } from "@/components/site/lang";
import { WeekdayInput } from "@/components/site/weekday-input";
import { errorText, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";


// [text, skewed background]: the skew lives on an absolute span so the text is never transformed (transformed text goes blurry)
const TONES = {
  rose: ["text-white", "bg-rose group-hover/sk:bg-rose-hi"],
  balkan: ["text-on-fill hover:text-ink", "bg-balkan group-hover/sk:bg-paper"],
  outline: ["text-paper", "border border-line group-hover/sk:border-rose"],
  danger: ["text-rose-hi", "border border-rose group-hover/sk:bg-rose/10"],
};

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof TONES; small?: boolean; fill?: string };

export function Btn({ tone = "rose", small, fill, className, children, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cn(
        "group/sk relative isolate inline-flex items-center justify-center gap-1.5 font-display font-bold disabled:pointer-events-none disabled:opacity-50",
        small ? "min-h-10 px-3.5 text-xs" : "min-h-10 px-4 text-sm",
        TONES[tone][0],
        className,
      )}
    >
      <span aria-hidden className={cn("absolute inset-0 -z-10 -skew-x-12", TONES[tone][1], fill)} />
      {children}
    </button>
  );
}

export type ConfirmAsk = { text: string; yes: string; no?: string; body?: React.ReactNode };
type Guard = (fd: FormData) => ConfirmAsk | null;
const GuardSlot = createContext<((g: Guard) => () => void) | null>(null);

/** inside an ActionForm: run a check on submit; return a confirm to ask first, or null to submit straight away */
export function useConfirmWhen(guard: Guard | null) {
  const register = useContext(GuardSlot);
  useEffect(() => (register && guard ? register(guard) : undefined), [register, guard]);
}

/** in-site confirm: call ask({ text, yes, onYes }) and render the returned dialog once */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [req, setReq] = useState<(ConfirmAsk & { onYes: () => void }) | null>(null);
  const ask = useCallback((r: ConfirmAsk & { onYes: () => void }) => {
    setReq(r);
    setOpen(true);
  }, []);
  const dialog = <Confirm open={open} text={req?.text ?? ""} yes={req?.yes ?? ""} no={req?.no} onYes={() => req?.onYes()} onClose={() => setOpen(false)}>{req?.body}</Confirm>;
  return [ask, dialog] as const;
}

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  className?: string;
  submit?: string;
  ghost?: boolean;
  confirm?: string;
  icon?: React.ReactNode;
};

export function ActionForm({ action, children, className, submit, ghost, confirm, icon }: Props) {
  const t = useDict();
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const guard = useRef<Guard | null>(null);
  const register = useCallback((g: Guard) => {
    guard.current = g;
    return () => {
      if (guard.current === g) guard.current = null;
    };
  }, []);
  const [ask, dialog] = useConfirm();
  const msg = state && (state.ok ? t.admin.saved : errorText(t, state.error));
  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmed.current) return void (confirmed.current = false);
        const q = guard.current?.(new FormData(e.currentTarget)) ?? (confirm ? { text: confirm, yes: submit ?? t.admin.save } : null);
        if (!q) return;
        e.preventDefault();
        ask({
          ...q,
          onYes: () => {
            confirmed.current = true;
            formRef.current?.requestSubmit();
          },
        });
      }}
    >
      <GuardSlot.Provider value={register}>{children}</GuardSlot.Provider>
      <div className="flex flex-wrap items-center gap-3">
        <Btn type="submit" disabled={pending} tone={ghost ? "outline" : "rose"} small={ghost}>
          {icon}
          {pending ? t.admin.saving : (submit ?? t.admin.save)}
        </Btn>
        {msg &&
          !pending &&
          (state?.ok ? (
            <Flash className="text-xs font-display font-bold text-balkan-hi">{msg}</Flash>
          ) : (
            <span role="status" className="text-xs font-display font-bold text-rose-hi">
              {msg}
            </span>
          ))}
      </div>
      {dialog}
    </form>
  );
}

export function Panel({ title, help, aside, children, className, i = 0 }: { title: string; help?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string; i?: number }) {
  return (
    <section className={cn("in-up relative", className)} style={{ "--i": i, "--s": "0.1s", "--d": "0.1s" } as React.CSSProperties}>
      <div className={cn("border-b border-line pb-3", aside && "flex flex-wrap items-center gap-x-4 gap-y-3")}>
        <h2 className="heading-slam flex items-center gap-3 text-xl sm:text-2xl">
          <span className="in-left-far relative inline-flex size-3.5 shrink-0 [--d:0.25s]">
            <Sparkle className={cn("inset-0 size-full", ["text-rose-hi", "text-balkan-hi", "text-paper/60"][i % 3])} delay={i * 0.2} />
          </span>
          <span className="in-wipe min-w-0 break-words [--d:0.3s]">{title}</span>
        </h2>
        {aside && <div className="in-right ml-auto flex flex-wrap items-center gap-3 [--d:0.35s]">{aside}</div>}
        {help && <p className="in-up mt-1 text-sm text-ash [--d:0.4s]">{help}</p>}
      </div>
      <div className="in-up pt-4 [--d:0.45s]">{children}</div>
    </section>
  );
}

export function Field({ className, inputClassName, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  return (
    <span className={cn("adm-field min-w-0", props.disabled && "opacity-45", className)}>
      <input {...props} className={cn("adm-bare", inputClassName)} />
    </span>
  );
}

/** date / datetime-local Field with the weekday shown inside, on an unskewed layer so it stays crisp; the tournament year is hidden */
export function DateTimeField({ defaultValue, className, ...props }: { name: string; defaultValue: string; kind?: "datetime-local" | "date"; className?: string; required?: boolean; "aria-label"?: string }) {
  const [val, setVal] = useState(defaultValue);
  return (
    <WeekdayInput
      {...props}
      value={val}
      onValue={setVal}
      className={cn("h-10 w-[21rem] max-w-full", className)}
      box="border border-line border-b-2 border-b-paper/16 bg-field transition-[border-color,background-color,box-shadow] group-hover/dt:border-paper/22 group-focus-within/dt:border-b-rose group-focus-within/dt:bg-well group-focus-within/dt:shadow-[4px_4px_0_0_var(--rose-deep)]"
      text="font-display text-[0.9rem] font-semibold text-paper tabular-nums"
    />
  );
}

export function IconAction({
  action,
  label,
  confirm,
  danger,
  bare,
  children,
}: {
  action: () => Promise<unknown>;
  label: string;
  confirm?: string;
  danger?: boolean;
  bare?: boolean;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  const [fail, setFail] = useState(false);
  const [ask, dialog] = useConfirm();
  const run = () =>
    start(async () => {
      try {
        setFail(false);
        await action();
      } catch {
        setFail(true);
      }
    });
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={pending}
        onClick={() => (confirm ? ask({ text: confirm, yes: label, onYes: run }) : run())}
        className={cn(
          "group relative isolate inline-flex size-10 items-center justify-center transition-[color,translate] duration-200 hover:-translate-y-0.5 disabled:opacity-50",
          danger ? "text-rose-hi hover:text-white" : "text-ash hover:text-paper",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10 -skew-x-12 border transition-[border-color,background-color] duration-200",
            danger ? "border-rose/50 group-hover:border-rose group-hover:bg-rose" : "border-line group-hover:border-paper/40 group-hover:bg-slate",
            bare && "border-transparent",
          )}
        />
        <span className={cn(pending && "animate-pulse")}>{children}</span>
      </button>
      {fail && !pending && <ErrorNote />}
      {dialog}
    </>
  );
}

export function ErrorNote({ children }: { children?: React.ReactNode }) {
  const t = useDict();
  return (
    <span role="status" className="in-left text-xs font-display font-bold text-rose-hi [--d:0s]">
      {children ?? t.admin.error}
    </span>
  );
}

// centered in-site confirm instead of the browser's window.confirm
function Confirm({ open, text, yes, no, onYes, onClose, children }: { open: boolean; text: string; yes: string; no?: string; onYes: () => void; onClose: () => void; children?: React.ReactNode }) {
  const t = useDict();
  return (
    <Modal open={open} onClose={onClose}>
      <p className="pr-8 text-base font-display font-black leading-snug text-paper">{text}</p>
      {children}
      <div className="mt-5 flex flex-wrap gap-3">
        <Btn
          type="button"
          onClick={() => {
            onClose();
            onYes();
          }}
        >
          {yes}
        </Btn>
        <Btn type="button" tone="outline" onClick={onClose}>
          {no ?? t.sched.cancel}
        </Btn>
      </div>
    </Modal>
  );
}
