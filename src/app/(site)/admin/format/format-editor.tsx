"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { DEFAULT_PLAN, roundStats, type Plan, type PlanRound } from "@/lib/format-plan";
import { cn } from "@/lib/utils";
import { resetPlan, savePlan } from "./actions";
import { Catalog, Edit } from "./format-context";
import { RoundCard } from "./format-round";
import { SubcategoryEditor } from "./format-subcategories";

export function FormatEditor({ initial, edit }: { initial: Plan; edit: boolean }) {
  const t = useDict();
  const [plan, setPlan] = useState(initial);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "err">("idle");
  const [tab, setTab] = useState(0);
  const sent = useRef(JSON.stringify(initial));
  const busy = useRef(false);
  const queued = useRef<Plan | null>(null);
  const setRound = (k: number, r: PlanRound) => setPlan((p) => ({ ...p, rounds: p.rounds.map((x, j) => (j === k ? r : x)) }));

  const push = useCallback(async (p: Plan) => {
    if (busy.current) {
      queued.current = p;
      return;
    }
    busy.current = true;
    setStatus("saving");
    let next: Plan | null = p;
    let ok = true;
    while (next) {
      const cur: Plan = next;
      queued.current = null;
      const r = await savePlan(cur).catch(() => null);
      if (r?.ok) sent.current = JSON.stringify(cur);
      ok = !!r?.ok;
      next = queued.current;
    }
    busy.current = false;
    setStatus(ok ? "saved" : "err");
  }, []);

  useEffect(() => {
    if (!edit || JSON.stringify(plan) === sent.current) return;
    const id = setTimeout(() => push(plan), 450);
    return () => clearTimeout(id);
  }, [plan, edit, push]);

  useEffect(() => {
    if (!edit) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (busy.current || JSON.stringify(plan) !== sent.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edit, plan]);

  const reset = () => {
    if (!window.confirm(t.admin.fp.confirmReset)) return;
    start(async () => {
      const r = await resetPlan().catch(() => null);
      if (r?.ok) {
        sent.current = JSON.stringify(DEFAULT_PLAN);
        setPlan(DEFAULT_PLAN);
        setStatus("saved");
      }
    });
  };

  return (
    <Edit.Provider value={edit}>
      <Catalog.Provider value={plan.subcategories}>
      <div className="space-y-6 pb-24">
        <div role="tablist" aria-label={t.admin.fp.round} className="flex flex-wrap gap-2">
          {plan.rounds.map((r, k) => {
            const on = k === tab;
            return (
              <button
                key={r.slug}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(k)}
                className={cn("relative flex h-11 -skew-x-12 items-center border px-4 transition-colors duration-200", on ? "border-rose text-white" : "border-line text-ash hover:border-paper/40 hover:text-paper")}
              >
                {on && <motion.span layoutId="format-tab" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 bg-rose shadow-[3px_3px_0_0_var(--color-rose-deep)]" />}
                <span className="relative flex skew-x-12 items-center gap-2 text-sm font-black uppercase">
                  {t.rounds[r.name] ?? r.name}
                  <span className={cn("num text-xs", on ? "opacity-80" : "text-ash")}>BO{roundStats(r).bestOf}</span>
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={plan.rounds[tab].slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <RoundCard r={plan.rounds[tab]} prev={plan.rounds.slice(0, tab)} onChange={(x) => setRound(tab, x)} />
          </motion.div>
        </AnimatePresence>

        <SubcategoryEditor groups={plan.subcategories} onChange={(subcategories) => setPlan((p) => ({ ...p, subcategories }))} />

        {edit && (
          <div className="fixed inset-x-4 bottom-4 z-40 flex justify-end gap-3 sm:inset-x-auto sm:right-6">
            <AnimatePresence mode="wait">
              {status !== "idle" && (
                <motion.span
                  key={status}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={cn("flex items-center gap-2 self-center text-xs font-black uppercase tracking-wide", status === "saved" ? "text-balkan" : status === "err" ? "text-rose-hi" : "text-ash")}
                >
                  {status === "saving" ? t.admin.saving : status === "saved" ? t.admin.saved : t.admin.error}
                  {status === "err" && (
                    <button type="button" onClick={() => push(plan)} className="underline underline-offset-2 hover:text-paper">
                      {t.error.retry}
                    </button>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
            <Btn type="button" tone="outline" onClick={reset} disabled={pending} className="bg-ink">
              <RotateCcw className="size-3.5" /> {t.admin.fp.reset}
            </Btn>
          </div>
        )}
      </div>
      </Catalog.Provider>
    </Edit.Provider>
  );
}
