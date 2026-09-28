"use client";

import { useActionState, useTransition } from "react";
import { Flash } from "./flash";
import { TriTick } from "@/components/site/graphics";
import { useDict } from "@/components/site/lang";
import type { ActionResult } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const inputCls = "min-w-0";
export const dateCls = "w-full min-w-0 [&::-webkit-date-and-time-value]:text-left";
export const labelCls = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";
export const checkLabelCls = "flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-bold uppercase tracking-wide";

const TONES = {
  rose: "bg-rose text-white hover:bg-rose-hi",
  balkan: "bg-balkan text-ink hover:bg-paper [--lift:var(--color-balkan-deep)]",
  outline: "border border-line text-paper hover:border-rose [--lift:var(--color-rose)]",
  danger: "border border-rose text-rose-hi hover:bg-rose/10 [--lift:var(--color-rose)]",
};

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof TONES; small?: boolean };

export function Btn({ tone = "rose", small, className, children, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cn(
        "lift-sm sheen inline-flex -skew-x-12 items-center justify-center font-black uppercase tracking-wide disabled:pointer-events-none disabled:opacity-50",
        small ? "min-h-10 px-3.5 text-xs" : "min-h-10 px-4 text-sm",
        TONES[tone],
        className,
      )}
    >
      <span className="inline-flex skew-x-12 items-center gap-1.5">{children}</span>
    </button>
  );
}

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  className?: string;
  submit?: string;
  ghost?: boolean;
  confirm?: string;
};

export function ActionForm({ action, children, className, submit, ghost, confirm }: Props) {
  const t = useDict();
  const [state, formAction, pending] = useActionState(action, null);
  const msg =
    state &&
    (state.ok
      ? t.admin.saved
      : state.error === "notFound"
        ? t.admin.notFound
        : state.error === "lastHost"
          ? t.admin.lastHost
          : state.error === "taken"
            ? t.admin.taken
            : state.error === "oneEach"
              ? t.admin.oneEach
              : t.admin.error);
  return (
    <form action={formAction} className={className} onSubmit={confirm ? (e) => !window.confirm(confirm) && e.preventDefault() : undefined}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Btn type="submit" disabled={pending} tone={ghost ? "outline" : "rose"} small={ghost}>
          {pending ? t.admin.saving : (submit ?? t.admin.save)}
        </Btn>
        {msg &&
          !pending &&
          (state?.ok ? (
            <Flash className="text-xs font-bold uppercase tracking-wide text-balkan">{msg}</Flash>
          ) : (
            <span role="status" className="text-xs font-bold uppercase tracking-wide text-rose-hi">
              {msg}
            </span>
          ))}
      </div>
    </form>
  );
}

export function Panel({ title, help, children, className, i = 0 }: { title: string; help?: string; children: React.ReactNode; className?: string; i?: number }) {
  return (
    <section className={cn("in-up border border-line bg-coal", className)} style={{ "--i": i, "--s": "0.1s", "--d": "0.1s" } as React.CSSProperties}>
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h2 className="heading-slam flex items-center gap-3 text-xl sm:text-2xl">
          <span className="in-left-far inline-flex [--d:0.25s]">
            <TriTick className="h-3 w-[22px]" />
          </span>
          <span className="in-wipe min-w-0 break-words [--d:0.3s]">{title}</span>
        </h2>
        {help && <p className="in-up mt-1 text-sm text-ash [--d:0.4s]">{help}</p>}
      </div>
      <div className="in-up p-4 sm:p-5 [--d:0.45s]">{children}</div>
    </section>
  );
}

export function Field({ className, inputClassName, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  return (
    <span className={cn("adm-field", props.disabled && "opacity-45", className)}>
      <input {...props} className={cn("adm-bare", inputClassName)} />
    </span>
  );
}

export function IconAction({
  action,
  label,
  confirm,
  danger,
  children,
}: {
  action: () => Promise<unknown>;
  label: string;
  confirm?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          try {
            await action();
          } catch {
            window.location.reload();
          }
        });
      }}
      className={cn(
        "group inline-flex size-10 -skew-x-12 items-center justify-center border transition-[color,border-color,background-color,transform] duration-200 hover:-translate-y-0.5 disabled:opacity-50",
        danger ? "border-rose/50 text-rose-hi hover:border-rose hover:bg-rose hover:text-white" : "border-line text-ash hover:border-paper/40 hover:bg-slate hover:text-paper",
      )}
    >
      <span className={cn("skew-x-12 transition-transform duration-200", pending && "animate-pulse")}>{children}</span>
    </button>
  );
}
