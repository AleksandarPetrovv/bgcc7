"use client";

import { useActionState } from "react";
import { useDict } from "@/components/site/lang";
import type { ActionResult } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const inputCls = "h-10 min-w-0 border border-line bg-ink px-3 text-sm text-paper outline-none transition-colors focus:border-balkan";
export const btnCls =
  "inline-flex min-h-10 items-center justify-center gap-2 bg-paper px-4 text-sm font-black uppercase tracking-wide text-ink transition hover:bg-white disabled:opacity-50";
export const ghostBtnCls =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-line px-3 text-xs font-black uppercase tracking-wide text-ash transition hover:border-rose hover:text-paper disabled:opacity-50";

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
  const msg = state && (state.ok ? t.admin.saved : state.error === "notFound" ? t.admin.notFound : t.admin.error);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={confirm ? (e) => !window.confirm(confirm) && e.preventDefault() : undefined}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={ghost ? ghostBtnCls : btnCls}>
          {pending ? t.admin.saving : (submit ?? t.admin.save)}
        </button>
        {msg && !pending && (
          <span role="status" className={cn("text-xs font-bold", state?.ok ? "text-balkan" : "text-rose-hi")}>
            {msg}
          </span>
        )}
      </div>
    </form>
  );
}

export function Panel({ title, help, children, className }: { title: string; help?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("border border-line bg-coal", className)}>
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-black uppercase tracking-wide">{title}</h2>
        {help && <p className="mt-0.5 text-xs text-ash">{help}</p>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
