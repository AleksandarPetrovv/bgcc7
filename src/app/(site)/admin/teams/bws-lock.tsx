"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { ErrorNote, useConfirm } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { SlantBg } from "@/components/site/slant";
import { errorText, type ActionError } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { lockBws, unlockBws } from "./actions";

/** one icon button: the lock icon shows the state, a click asks first. disabled for non-hosts and once the draw has started */
export function BwsLock({ locked, host, drawn }: { locked: boolean; host: boolean; drawn: boolean }) {
  const t = useDict();
  const l = t.admin.bwsLock;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fail, setFail] = useState<{ error?: ActionError; slot?: string } | null>(null);
  const [ask, dialog] = useConfirm();
  const label = locked ? l.unlock : l.lock;

  const run = () =>
    start(async () => {
      setFail(null);
      try {
        const res = await (locked ? unlockBws : lockBws)();
        if (res?.ok) router.refresh();
        else setFail({ error: res?.error, slot: res?.slot });
      } catch {
        setFail({});
      }
    });

  return (
    <>
      {fail && !pending && <ErrorNote>{fail.error === "locked" ? l.drawn : errorText(t, fail.error, fail.slot)}</ErrorNote>}
      <button
        type="button"
        aria-label={label}
        title={drawn ? l.drawn : label}
        disabled={!host || drawn || pending}
        onClick={() => ask({ text: locked ? l.unlockText : l.lockText, yes: label, onYes: run })}
        className="group relative isolate inline-flex size-10 items-center justify-center text-ash transition-[color,translate,opacity] duration-200 enabled:hover:-translate-y-0.5 enabled:hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SlantBg className="border border-line transition-[border-color,background-color] duration-200 group-enabled:group-hover:border-paper/40 group-enabled:group-hover:bg-slate" />
        <span key={locked ? "locked" : "open"} className={cn("in-pop", pending && "animate-pulse")}>
          {locked ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
        </span>
      </button>
      {dialog}
    </>
  );
}
