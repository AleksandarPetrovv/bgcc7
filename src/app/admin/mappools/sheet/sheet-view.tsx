"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { InView } from "@/components/site/in-view";
import { useDict } from "@/components/site/lang";
import { cn } from "@/lib/utils";

type Mod = { key: string; short: string; color: string; count: number };

const Ctx = createContext<{ mod: string }>({ mod: "all" });

export function SheetView({ stageId, version, mods, children }: { stageId: number; version: string; mods: Mod[]; children: React.ReactNode }) {
  const t = useDict();
  const router = useRouter();
  const [mod, setMod] = useState("all");
  const latest = useRef(version);
  useEffect(() => {
    latest.current = version;
  }, [version]);

  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const r = await fetch(`/api/admin/pool-sheet/${stageId}`, { cache: "no-store" });
        if (r.ok) {
          const { v } = (await r.json()) as { v: string };
          if (v && v !== latest.current) {
            latest.current = v;
            router.refresh();
          }
        }
      } catch {}
      busy = false;
    };
    const id = setInterval(tick, 3000);
    const onVis = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [stageId, router]);

  const chips = [{ key: "all", short: t.admin.allMods, color: "var(--color-paper)", count: mods.reduce((n, m) => n + m.count, 0) }, ...mods];

  return (
    <Ctx.Provider value={{ mod }}>
      {mods.length > 0 && (
        <div role="tablist" aria-label={t.admin.mod} className="in-up mb-5 flex flex-wrap gap-2 [--d:0.3s]">
          {chips.map((c) => {
            const on = mod === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMod(c.key)}
                className="group relative flex h-10 -skew-x-12 items-center border px-4 transition-[border-color,color,transform] duration-200 hover:-translate-y-0.5"
                style={{ borderColor: on ? c.color : "var(--color-line)", color: on ? "var(--color-ink)" : c.color }}
              >
                {on && (
                  <motion.span
                    layoutId={`mod-chip-${stageId}`}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    className="absolute inset-0"
                    style={{ background: c.color }}
                  />
                )}
                <span className="relative flex skew-x-12 items-center gap-2 text-sm font-black uppercase">
                  {c.short}
                  <span className={cn("num text-xs", on ? "opacity-70" : "text-ash")}>{c.count}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
}

export function SlotBox({
  mod,
  id,
  i,
  picked,
  color,
  header,
  children,
}: {
  mod: string;
  id: string;
  i: number;
  picked: boolean;
  color: string;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useDict();
  const { mod: filter } = useContext(Ctx);
  const [open, setOpen] = useState(true);
  const toggle = () => setOpen((o) => !o);
  const shown = filter === "all" || filter === mod;

  return (
    <AnimatePresence initial={false}>
      {shown && (
        <motion.div
          key={id}
          initial={{ opacity: 0, height: 0, y: 12 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-clip"
        >
          <div className="pb-4">
            <InView
              as="section"
              self
              scrub
              className={cn("sr in-up relative overflow-clip border bg-coal", picked ? "border-balkan/50" : "border-line")}
              style={{ "--i": i < 5 ? i : 0, "--s": "0.1s", "--d": "0.4s" } as React.CSSProperties}
            >
              <span className="sr in-grow absolute inset-x-0 top-0 h-0.5 [--d:0.55s]" style={{ background: color }} aria-hidden />
              <header
                className={cn(
                  "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 transition-[border-color] duration-200",
                  open ? "border-b border-line" : "border-b border-transparent",
                )}
              >
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={open}
                  aria-label={open ? t.admin.collapse : t.admin.expand}
                  title={open ? t.admin.collapse : t.admin.expand}
                  className="-ml-1 grid size-8 shrink-0 -skew-x-12 place-items-center border border-line text-ash transition-colors hover:border-paper/40 hover:text-paper"
                >
                  <ChevronDown className={cn("size-4 skew-x-12 transition-transform duration-300", !open && "-rotate-90")} />
                </button>
                {header}
              </header>
              <div className={cn("grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="min-h-0 overflow-clip">{children}</div>
              </div>
            </InView>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
