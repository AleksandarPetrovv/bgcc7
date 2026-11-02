"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { Popup, PopupTitle } from "./popup";
import { acceptPhase, dismissPhase } from "@/actions/phase";
import { PHASES } from "@/lib/sections";
import { Glyph } from "./graphics";
import { useDict } from "./lang";
import { cn, cssVars } from "@/lib/utils";
import { SlantBg } from "./slant";


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
    <Popup open={open} onClose={() => setOpen(false)} closeButton={false} shadow={6} className="grid w-full max-w-[calc(100%-2rem)] gap-4 overflow-hidden p-0 text-sm sm:max-w-lg">
      <div className="relative overflow-hidden border-b border-line px-5 pb-6 pt-5 sm:px-7">
        <div className="anim-drift pointer-events-none absolute inset-0 w-[calc(100%+7.5rem)] bg-[repeating-linear-gradient(115deg,transparent_0_40px,color-mix(in_srgb,var(--rose)_7%,transparent)_40px_42px)]" aria-hidden />
        <div className="in-left relative flex items-center gap-2.5 text-xs font-display font-bold text-rose-hi" style={cssVars({ "--d": "0.15s" })}>
          <Glyph kind="spark" className="size-3" /> {t.admin.prompt.kicker}
        </div>
        <PopupTitle className="in-wipe heading-slam relative mt-3 text-3xl leading-none sm:text-4xl" style={cssVars({ "--d": "0.25s" })}>
          {t.admin.prompt.title(name)}
        </PopupTitle>
        <p className="in-up relative mt-3 text-sm text-paper/75" style={cssVars({ "--d": "0.4s" })}>
          {t.admin.prompt.body(name)}
        </p>
        <ol className="relative mt-6 flex items-center gap-1.5">
          {PHASES.map((p, i) => (
            <li key={p} className="in-pop flex min-w-0 flex-1 flex-col items-center gap-1.5" style={cssVars({ "--i": i, "--s": "0.06s", "--d": "0.5s" })}>
              <span
                className={cn(
                  "h-2 w-full -skew-x-12",
                  i === to ? "animate-pulse bg-rose" : i === from ? "bg-paper/70" : i < from ? "bg-paper/25" : "bg-slate",
                )}
              />
              <span className={cn("hidden w-full truncate text-center text-[0.6rem] font-display font-bold sm:block", i === to ? "text-rose-hi" : i === from ? "text-paper" : "text-ash")}>
                {t.admin.phases[p]}
              </span>
            </li>
          ))}
        </ol>
        <div className="in-up relative mt-2 flex items-center gap-2 text-xs font-display font-bold sm:hidden" style={cssVars({ "--d": "0.8s" })}>
          <span className="text-paper">{t.admin.phases[current]}</span>
          <ArrowRight className="size-3.5 text-ash" />
          <span className="text-rose-hi">{name}</span>
        </div>
      </div>
      <div className={cn("flex flex-col gap-2.5 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:px-7", pending && "pointer-events-none opacity-60")}>
        <button
          type="button"
          onClick={() => run(() => acceptPhase(next))}
          className="in-pop group relative isolate inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-display font-bold text-white"
          style={cssVars({ "--d": "0.7s" })}
        >
          <SlantBg className="bg-rose shadow-[3px_3px_0_0_var(--rose-deep)] group-hover:bg-rose-hi" />
          <Check className="size-4" /> {t.admin.prompt.yes(name)}
        </button>
        <Link
          href="/admin/phase"
          onClick={() => setOpen(false)}
          className="in-pop group relative isolate inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-display font-bold text-paper"
          style={cssVars({ "--d": "0.78s" })}
        >
          <SlantBg className="border border-line group-hover:border-rose" />
          {t.admin.prompt.stages} <ArrowRight className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => run(() => dismissPhase(next))}
          className="in-pop inline-flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-display font-bold text-ash transition-colors hover:text-paper sm:ml-auto"
          style={cssVars({ "--d": "0.86s" })}
        >
          <X className="size-4" /> {t.admin.prompt.no}
        </button>
      </div>
    </Popup>
  );
}
