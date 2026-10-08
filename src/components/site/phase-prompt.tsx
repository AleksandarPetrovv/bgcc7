"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { acceptPhase, dismissPhase } from "@/app/(site)/admin/phase/actions";
import { PHASES } from "@/lib/sections";
import { TriTick } from "./graphics";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";

const v = (o: Record<string, string | number>) => o as React.CSSProperties;

export function PhasePrompt({ current, next }: { current: string; next: string }) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();
  const name = t.admin.phases[next];
  const from = PHASES.indexOf(current as (typeof PHASES)[number]);
  const to = PHASES.indexOf(next as (typeof PHASES)[number]);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      setOpen(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="mdlg overflow-hidden rounded-none border border-line bg-ink p-0 ring-0 sm:max-w-lg">
        <div className="relative overflow-hidden border-b border-line px-5 pb-6 pt-5 sm:px-7">
          <div className="anim-drift pointer-events-none absolute inset-0 w-[calc(100%+120px)] bg-[repeating-linear-gradient(115deg,transparent_0_40px,rgba(224,36,47,0.07)_40px_42px)]" aria-hidden />
          <div className="in-left relative flex items-center gap-2.5 text-xs font-black uppercase text-rose-hi" style={v({ "--d": "0.15s" })}>
            <TriTick className="h-2.5 w-[18px]" /> {t.admin.prompt.kicker}
          </div>
          <DialogTitle className="in-wipe heading-slam relative mt-3 text-3xl leading-none sm:text-4xl" style={v({ "--d": "0.25s" })}>
            {t.admin.prompt.title(name)}
          </DialogTitle>
          <p className="in-up relative mt-3 text-sm text-paper/75" style={v({ "--d": "0.4s" })}>
            {t.admin.prompt.body(name)}
          </p>
          <ol className="relative mt-6 flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <li key={p} className="in-pop flex min-w-0 flex-1 flex-col items-center gap-1.5" style={v({ "--i": i, "--s": "0.06s", "--d": "0.5s" })}>
                <span
                  className={cn(
                    "h-2 w-full -skew-x-12",
                    i === to ? "animate-pulse bg-rose" : i === from ? "bg-paper/70" : i < from ? "bg-paper/25" : "bg-slate",
                  )}
                />
                <span className={cn("hidden w-full truncate text-center text-[0.6rem] font-black uppercase sm:block", i === to ? "text-rose-hi" : i === from ? "text-paper" : "text-ash")}>
                  {t.admin.phases[p]}
                </span>
              </li>
            ))}
          </ol>
          <div className="in-up relative mt-2 flex items-center gap-2 text-xs font-black uppercase sm:hidden" style={v({ "--d": "0.8s" })}>
            <span className="text-paper">{t.admin.phases[current]}</span>
            <ArrowRight className="size-3.5 text-ash" />
            <span className="text-rose-hi">{name}</span>
          </div>
        </div>
        <div className={cn("flex flex-col gap-2.5 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:px-7", pending && "pointer-events-none opacity-60")}>
          <button
            type="button"
            onClick={() => run(() => acceptPhase(next))}
            className="in-pop lift-sm sheen inline-flex -skew-x-12 items-center justify-center bg-rose px-5 py-3 text-sm font-black uppercase text-white shadow-[3px_3px_0_0_var(--color-rose-deep)] hover:bg-rose-hi"
            style={v({ "--d": "0.7s" })}
          >
            <span className="inline-flex skew-x-12 items-center gap-2">
              <Check className="size-4" /> {t.admin.prompt.yes(name)}
            </span>
          </button>
          <Link
            href="/admin/phase"
            onClick={() => setOpen(false)}
            className="in-pop lift-sm inline-flex -skew-x-12 items-center justify-center border border-line px-5 py-3 text-sm font-black uppercase text-paper [--lift:var(--color-rose)] hover:border-rose"
            style={v({ "--d": "0.78s" })}
          >
            <span className="inline-flex skew-x-12 items-center gap-2">
              {t.admin.prompt.stages} <ArrowRight className="size-4" />
            </span>
          </Link>
          <button
            type="button"
            onClick={() => run(() => dismissPhase(next))}
            className="in-pop inline-flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-black uppercase text-ash transition-colors hover:text-paper sm:ml-auto"
            style={v({ "--d": "0.86s" })}
          >
            <X className="size-4" /> {t.admin.prompt.no}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
