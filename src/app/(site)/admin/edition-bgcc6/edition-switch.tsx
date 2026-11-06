"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { EDITIONS, type Edition } from "@/lib/format";
import { cn } from "@/lib/utils";
import { switchEdition } from "./actions";
import { GOLD as GOLD_C } from "@/lib/theme";
import { Sparkle } from "@/components/site/graphics";

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
    <div className="relative border-t border-line px-3 py-3 lg:py-4">
      <div className="mb-2.5 flex items-center gap-2 text-[0.65rem] font-display font-bold text-gold-hi">
        <span className="size-1.5 rotate-45" style={{ background: GOLD }} aria-hidden />
        {t.admin.edition}
        {pending && <Loader2 className="ml-auto size-3.5 animate-spin" />}
      </div>
      <div role="radiogroup" aria-label={t.admin.edition} className={cn("relative flex gap-x-4", pending && "opacity-70")}>
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
              className={cn("relative px-1.5 pb-2 pt-1.5 text-sm uppercase font-display font-bold transition-colors duration-200", on ? "text-paper" : "text-ash hover:text-paper")}
            >
              {on && (
                <>
                  <motion.span layoutId="edition-bar" transition={{ type: "spring", stiffness: 520, damping: 40 }} className="absolute inset-x-1.5 bottom-0 h-[3px] -skew-x-12" style={{ background: GOLD }} aria-hidden />
                  <motion.span layoutId="edition-spark" transition={{ type: "spring", stiffness: 520, damping: 40 }} className="absolute -top-0.5 right-0 size-3" aria-hidden>
                    <Sparkle className="inset-0 size-full text-gold-hi" />
                  </motion.span>
                </>
              )}
              {e}
            </button>
          );
        })}
      </div>
    </div>
  );
}
