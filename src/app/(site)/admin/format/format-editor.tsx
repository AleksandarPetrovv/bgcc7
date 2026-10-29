"use client";

import { startTransition, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { Btn } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { DEFAULT_PLAN, roundStats, type Plan, type PlanRound } from "@/lib/format-plan";
import { cn } from "@/lib/utils";
import { Cascade } from "@/components/site/cascade";
import { resetPlan, savePlan } from "./actions";
import { Catalog, Edit } from "./format-context";
import { RoundCard } from "./format-round";
import { SubcategoryEditor } from "./format-subcategories";
import { FormatWriter, type WriteState } from "./format-writer";

function runAction(action: () => Promise<{ ok: boolean } | null>) {
  return new Promise<{ ok: boolean } | null>((resolve) => {
    startTransition(async () => {
      try {
        resolve(await action());
      } catch {
        resolve(null);
      }
    });
  });
}

export function FormatEditor({ initial, edit }: { initial: Plan; edit: boolean }) {
  const t = useDict();
  const [plan, setPlan] = useState(initial);
  const [{ status, resetting }, setWriteState] = useState<WriteState>({ status: "idle", resetting: false });
  const [tab, setTab] = useState(0);
  const [writer] = useState(() => new FormatWriter({
    initial,
    defaults: DEFAULT_PLAN,
    save: (next) => runAction(() => savePlan(next)),
    reset: () => runAction(resetPlan),
    onPlan: setPlan,
    onState: setWriteState,
  }));
  const change = (update: (current: Plan) => Plan) => {
    if (edit) writer.change(update);
  };
  const setRound = (k: number, r: PlanRound) => change((p) => ({ ...p, rounds: p.rounds.map((x, j) => (j === k ? r : x)) }));

  useEffect(() => {
    writer.activate();
    return () => writer.dispose();
  }, [writer]);

  useEffect(() => {
    if (!edit) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (writer.dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edit, writer]);

  const reset = () => {
    if (!edit || resetting || !window.confirm(t.admin.fp.confirmReset)) return;
    writer.reset();
  };

  return (
    <Edit.Provider value={edit && !resetting}>
      <Catalog.Provider value={plan.subcategories}>
      <div className="space-y-6 pb-24" aria-busy={resetting}>
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
                style={{ "--i": k, "--s": "0.06s", "--d": "0.1s" } as React.CSSProperties}
                className={cn("in-left relative flex h-11 -skew-x-12 items-center border px-4 transition-colors duration-200", on ? "border-rose text-white" : "border-line text-ash hover:border-paper/40 hover:text-paper")}
              >
                {on && <motion.span layoutId="format-tab" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 bg-rose shadow-[3px_3px_0_0_var(--rose-deep)]" />}
                <span className="relative flex skew-x-12 items-center gap-2 text-sm font-display font-bold">
                  {t.rounds[r.name] ?? r.name}
                  <span className={cn("num text-xs", on ? "opacity-80" : "text-ash")}>BO{roundStats(r).bestOf}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={plan.rounds[tab].slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <Cascade step={0.012} className="[--d:0.1s]">
              <RoundCard r={plan.rounds[tab]} prev={plan.rounds.slice(0, tab)} onChange={(x) => setRound(tab, x)} />
            </Cascade>
          </motion.div>
        </AnimatePresence>
        </div>

        <div>
          <SubcategoryEditor groups={plan.subcategories} onChange={(subcategories) => change((p) => ({ ...p, subcategories }))} />
        </div>

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
                  className={cn("flex items-center gap-2 self-center text-xs font-display font-bold", status === "saved" ? "text-balkan-hi" : status === "err" ? "text-rose-hi" : "text-ash")}
                >
                  {status === "saving" ? t.admin.saving : status === "saved" ? t.admin.saved : t.admin.error}
                  {status === "err" && (
                    <button type="button" onClick={() => writer.retry()} className="underline underline-offset-2 hover:text-paper">
                      {t.error.retry}
                    </button>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
            <Btn type="button" tone="outline" onClick={reset} disabled={resetting} className="bg-ink">
              <RotateCcw className="size-3.5" /> {t.admin.fp.reset}
            </Btn>
          </div>
        )}
      </div>
      </Catalog.Provider>
    </Edit.Provider>
  );
}
