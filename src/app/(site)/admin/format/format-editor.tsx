"use client";

import { startTransition, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { Btn, useConfirm } from "@/components/admin/form";
import { useDict } from "@/components/site/lang";
import { DEFAULT_PLAN, type Plan, type PlanRound } from "@/lib/format-plan";
import { cn } from "@/lib/utils";
import { Cascade } from "@/components/site/cascade";
import { Tabs } from "@/components/site/tabs";
import { resetPlan, savePlan } from "./actions";
import { Catalog, Edit } from "./format-context";
import { RoundCard } from "./format-round";
import { SubcategoryEditor } from "./format-subcategories";
import { FormatWriter, type WriteState } from "./format-writer";
import { roundName } from "@/lib/i18n/dict";

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

export function FormatEditor({ initial }: { initial: Plan }) {
  const t = useDict();
  const [plan, setPlan] = useState(initial);
  const [ws, setWriteState] = useState<WriteState>({ status: "idle", resetting: false });
  const { status, resetting } = ws;
  const [tab, setTabState] = useState(0);
  const [switched, setSwitched] = useState(false);
  const setTab = (i: number) => {
    setSwitched(true);
    setTabState(i);
  };
  const [staleFor, setStaleFor] = useState<WriteState | null>(null);
  useEffect(() => {
    if (ws.status !== "saved") return;
    const id = setTimeout(() => setStaleFor(ws), 5000);
    return () => clearTimeout(id);
  }, [ws]);
  const [writer] = useState(() => new FormatWriter({
    initial,
    defaults: DEFAULT_PLAN,
    save: (next) => runAction(() => savePlan(next)),
    reset: () => runAction(resetPlan),
    onPlan: setPlan,
    onState: setWriteState,
  }));
  const change = (update: (current: Plan) => Plan) => writer.change(update);
  const setRound = (k: number, r: PlanRound) => change((p) => ({ ...p, rounds: p.rounds.map((x, j) => (j === k ? r : x)) }));

  useEffect(() => {
    writer.activate();
    return () => writer.dispose();
  }, [writer]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (writer.dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [writer]);

  const [ask, dialog] = useConfirm();
  const reset = () => {
    if (resetting) return;
    ask({ text: t.admin.fp.confirmReset, yes: t.admin.fp.reset, onYes: () => writer.reset() });
  };

  return (
    <Edit.Provider value={!resetting}>
      <Catalog.Provider value={plan.subcategories}>
      <div className="space-y-6 pb-24" aria-busy={resetting}>
        <Tabs
          label={t.admin.fp.round}
          className="in-left [--d:0.1s]"
          index={tab}
          onChange={setTab}
          options={plan.rounds.map((r) => roundName(t, r.name))}
        />

        <div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={plan.rounds[tab].slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <Cascade step={0.012} className={cn("[--d:0.25s]", switched && "no-intro")}>
              <RoundCard r={plan.rounds[tab]} prev={plan.rounds.slice(0, tab)} onChange={(x) => setRound(tab, x)} />
            </Cascade>
          </motion.div>
        </AnimatePresence>
        </div>

        <div>
          <SubcategoryEditor groups={plan.subcategories} onChange={(subcategories) => change((p) => ({ ...p, subcategories }))} />
        </div>

        <div className="fixed inset-x-4 bottom-4 z-40 flex justify-end gap-3 sm:inset-x-auto sm:right-6">
          <AnimatePresence mode="wait">
            {status !== "idle" && staleFor !== ws && (
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
          <Btn type="button" tone="outline" onClick={reset} disabled={resetting} fill="bg-ink">
            <RotateCcw className="size-3.5" /> {t.admin.fp.reset}
          </Btn>
        </div>
        {dialog}
      </div>
      </Catalog.Provider>
    </Edit.Provider>
  );
}
