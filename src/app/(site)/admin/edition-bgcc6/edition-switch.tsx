"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { EDITIONS, type Edition } from "@/lib/format";
import { cn } from "@/lib/utils";
import { switchEdition } from "./actions";
import { GOLD as GOLD_C, tint } from "@/lib/theme";

const GOLD = GOLD_C.c;

export function EditionSwitch({ edition }: { edition: Edition }) {
  const t = useDict();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean }>, ask?: string) => {
    if (ask && !window.confirm(ask)) return;
    start(async () => {
      await fn();
      router.refresh();
    });
  };

  return (
    <div className="relative border-t border-dashed border-line p-3 lg:p-4">
      <div className="mb-2.5 flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-gold-hi">
        <span className="size-1.5 rotate-45" style={{ background: GOLD }} aria-hidden />
        {t.admin.edition}
        {pending && <Loader2 className="ml-auto size-3.5 animate-spin" />}
      </div>
      <div role="radiogroup" aria-label={t.admin.edition} className={cn("relative grid h-12 grid-cols-2 -skew-x-12 border", pending && "opacity-70")} style={{ borderColor: tint(GOLD, 40) }}>
        {EDITIONS.map((e) => {
          const on = e === edition;
          return (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={pending}
              onClick={() => !on && run(() => switchEdition(e), t.admin.confirmEdition(e.toUpperCase()))}
              className={cn("relative font-black uppercase tracking-wide transition-colors duration-200", on ? "text-paper" : "text-ash hover:text-paper")}
            >
              {on && (
                <motion.span
                  layoutId="edition-pill"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                  className="absolute inset-0 shadow-[3px_3px_0_0_var(--gold-deep)]"
                  style={{ background: GOLD }}
                  aria-hidden
                />
              )}
              <span className="relative inline-block skew-x-12 text-sm">{e}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
