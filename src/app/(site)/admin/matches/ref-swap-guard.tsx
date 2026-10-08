"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Gavel, X } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";

function Name({ n }: { n: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full -skew-x-12 border border-line bg-slate px-3 py-1.5">
      <span className="skew-x-12 truncate text-base font-black">{n}</span>
    </span>
  );
}

export function RefSwapGuard({ live, lobby, from }: { live: boolean; lobby: boolean; from: string }) {
  const t = useDict();
  const r = t.admin.refSwap;
  const anchor = useRef<HTMLSpanElement>(null);
  const pass = useRef(false);
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form || !live) return;
    const check = (e: SubmitEvent) => {
      if (pass.current) {
        pass.current = false;
        return;
      }
      const next = String(new FormData(form).get("referee") ?? "");
      if (next === from) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setTo(next);
    };
    form.addEventListener("submit", check, true);
    return () => form.removeEventListener("submit", check, true);
  }, [live, from]);

  useEffect(() => {
    if (to === null) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTo(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [to]);

  const go = () => {
    const form = anchor.current?.closest("form");
    setTo(null);
    pass.current = true;
    form?.requestSubmit();
  };

  return (
    <>
      <span ref={anchor} hidden />
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {to !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
                onClick={() => setTo(null)}
              >
                <motion.div
                  initial={{ y: 40, scale: 0.92, skewY: 1.5 }}
                  animate={{ y: 0, scale: 1, skewY: 0 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 340, damping: 26 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-md overflow-hidden border-2 border-rose bg-coal p-6 shadow-[6px_6px_0_0_var(--color-rose-deep)]"
                  role="alertdialog"
                  aria-modal="true"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose via-rose-hi to-transparent" aria-hidden />
                  <button type="button" onClick={() => setTo(null)} aria-label={t.draft.close} className="absolute right-2 top-2 p-2 text-ash hover:text-paper">
                    <X className="size-4" />
                  </button>
                  <Gavel className="size-7 text-rose-hi" />
                  <h3 className="heading-slam mt-2 text-2xl">{r.title}</h3>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Name n={from || t.common.tbd} />
                    <motion.span initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1, transition: { delay: 0.15 } }}>
                      <ArrowRight className="size-5 text-rose-hi" />
                    </motion.span>
                    <Name n={to || t.common.tbd} />
                  </div>
                  <p className="mt-4 text-sm text-paper/75">{r.text(to || t.common.tbd, from || t.common.tbd)}</p>
                  {lobby && <p className="mt-1.5 text-sm font-bold text-gold">{r.lobby}</p>}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Btn type="button" onClick={go}>
                      {r.yes}
                    </Btn>
                    <Btn type="button" tone="outline" onClick={() => setTo(null)}>
                      {r.no}
                    </Btn>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
