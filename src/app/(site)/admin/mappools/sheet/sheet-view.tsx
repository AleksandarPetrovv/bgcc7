"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { usePollRefresh } from "@/components/site/use-poll-refresh";
import { AnimatePresence, motion } from "motion/react";
import { RuleDiamond } from "@/components/site/rule";
import { useDict } from "@/components/site/lang";
import { modHi } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";

type Mod = { key: string; short: string; color: string; count: number };

const Ctx = createContext<{ mod: string; order: string[] }>({ mod: "all", order: [] });

/** `order`: each slot's mod key, top to bottom, so the intro staggers by place among the shown slots */
export function SheetView({ stageId, version, mods, order, sr, clock, children }: { stageId: number; version: string; mods: Mod[]; order: string[]; sr: { target: number | null; now: number | null }; clock?: React.ReactNode; children: React.ReactNode }) {
  const t = useDict();
  const [mod, setMod] = useState("all");
  // hold the slots (and their intros) until every cover and thumbnail has loaded, so nothing shows up blank
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const imgs = [...(box.current?.querySelectorAll("img") ?? [])];
    const cap = setTimeout(() => setReady(true), 5000); // shortcut: a dead image url never blocks the sheet for more than 5s
    Promise.all(imgs.map((i) => i.decode().catch(() => {}))).then(() => setReady(true));
    return () => clearTimeout(cap);
  }, []);
  usePollRefresh(
    version,
    async () => {
      const r = await fetch(`/api/admin/pool-sheet/${stageId}`, { cache: "no-store" });
      return r.ok ? ((await r.json()) as { v: string }).v : null;
    },
    3000,
    "visible",
  );

  const chips = [{ key: "all", short: t.admin.allMods, color: "var(--paper)", count: mods.reduce((n, m) => n + m.count, 0) }, ...mods];

  return (
    <Ctx.Provider value={{ mod, order }}>
      {/* the clock floats above the mods row on the right, so it never pushes anything down */}
      <div className="relative">
      {clock && <div className="in-right mb-3 flex justify-end [--d:0.3s] sm:absolute sm:bottom-full sm:right-0 sm:mb-2">{clock}</div>}
      {mods.length > 0 && (
        <div className="in-up mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 [--d:0.3s]">
        <div role="tablist" aria-label={t.admin.mod} className="flex flex-wrap gap-x-4 gap-y-1">
          {chips.map((c) => {
            const on = mod === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMod(c.key)}
                className={cn("relative flex items-center gap-2 px-1.5 pb-2 pt-1.5 text-sm font-display font-bold transition-colors duration-200", on ? "" : "text-ash hover:text-paper")}
                style={on ? { color: modHi(c.color) } : undefined}
              >
                {on && (
                  <>
                    <motion.span layoutId={`mod-bar-${stageId}`} transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-x-1.5 bottom-0 h-[3px] -skew-x-12" style={{ background: c.color }} aria-hidden />
                  </>
                )}
                {c.short}
                <span className="num text-xs text-ash">{c.count}</span>
              </button>
            );
          })}
        </div>
          <div className="in-right ml-auto flex items-center gap-3 text-xs font-display font-bold text-ash [--d:0.35s]">
            <span className="flex items-baseline gap-1.5">
              {t.admin.fp.targetSr}
              <span className="num text-base text-gold-hi [text-shadow:0_0_10px_color-mix(in_srgb,var(--gold)_45%,transparent)]">{sr.target != null ? `${sr.target.toFixed(2)}★` : "?"}</span>
            </span>
            <span className="h-4 w-px bg-line" aria-hidden />
            <span className="flex items-baseline gap-1.5">
              {t.admin.currentSr}
              <span className="num text-base text-paper">{sr.now != null ? `${sr.now.toFixed(2)}★` : "?"}</span>
            </span>
          </div>
        </div>
      )}
      </div>
      <div ref={box} className={cn("iv", ready ? "in" : "invisible")}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function SlotBox({
  mod,
  id,
  i,
  picked,
  empty,
  color,
  header,
  pick,
  children,
}: {
  mod: string;
  id: string;
  i: number;
  picked: boolean;
  empty?: boolean;
  color: string;
  header: React.ReactNode;
  /** a host's Pick for an elected map not yet in the pool; otherwise an elected slot shows a tick */
  pick?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useDict();
  const { mod: filter, order } = useContext(Ctx);
  const place = filter === "all" ? i : order.slice(0, i).filter((m) => m === filter).length;
  const [open, setOpen] = useState(!picked);
  const toggle = () => setOpen((o) => !o);
  const shown = filter === "all" || filter === mod;

  return (
    <AnimatePresence initial={false}>
      {shown && (
        <motion.div
          key={id}
          initial={{ opacity: 0, height: 0, y: 12 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -8, transition: { duration: 0.2 } }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: Math.min(place, 12) * 0.05 }}
          className="overflow-clip"
        >
          <div className="pb-7">
            <section
              className={cn("in-up relative overflow-x-clip border-b", picked ? "border-balkan/50" : "border-line")}
              style={{ "--i": Math.min(place, 12), "--s": "0.07s", "--d": "0.4s" } as React.CSSProperties}
            >
              <RuleDiamond />
              <span className="in-grow absolute inset-x-0 top-0 h-0.5 [--d:0.55s]" style={{ background: color }} aria-hidden />
              <header
                onClick={(e) => !empty && !(e.target as Element).closest("a,button,input,label,form") && toggle()}
                className={cn(
                  "relative flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 pr-3 transition-[border-color,background-color] duration-200",
                  !empty && "cursor-pointer pr-[4.75rem] hover:bg-paper/[0.03]",
                  open && !empty ? "border-b border-line" : "border-b border-transparent",
                )}
              >
                {header}
                {/* centred in the header row, so opening the slot never moves it; Pick always shows, the tick only while collapsed */}
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  {pick ? (
                    <div className="in-pop pointer-events-auto [--d:0.6s]">{pick}</div>
                  ) : (
                    picked && (
                      <span className={cn("transition-opacity duration-200", open && "opacity-0")}>
                        <span className="in-pop block [--d:0.6s]">
                          <Check className="size-5 text-balkan" strokeWidth={3} aria-label={t.admin.pf.elected} />
                        </span>
                      </span>
                    )
                  )}
                </div>
                {!empty && (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-label={open ? t.admin.collapse : t.admin.expand}
                    title={open ? t.admin.collapse : t.admin.expand}
                    className="group/fold absolute right-3 top-1/2 isolate grid size-10 -translate-y-1/2 place-items-center text-ash transition-colors hover:text-paper"
                  >
                    <SlantBg className="border border-line transition-colors group-hover/fold:border-paper/40" />
                    <ChevronDown className={cn("size-4 transition-transform duration-300", !open && "-rotate-90")} />
                  </button>
                )}
              </header>
              {!empty && (
                <div className={cn("grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="min-h-0 overflow-clip">{children}</div>
                </div>
              )}
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
