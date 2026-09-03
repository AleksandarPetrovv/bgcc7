"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownToLine, ArrowUpRight, Download, Play, Star } from "lucide-react";
import { Container, PageTitle, SlantButton, StageTabs } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import { MODS, fmtLen, type Stage } from "@/lib/data";
import { osuMap } from "@/lib/links";
import { cn } from "@/lib/utils";

export function MappoolView({ stages, initial }: { stages: Stage[]; initial?: string }) {
  const t = useDict();
  const start = stages.findIndex((s) => s.slug === initial);
  const [i, setI] = useState(start >= 0 ? start : Math.max(0, stages.length - 1));
  const pick = (n: number) => {
    setI(n);
    if (stages[n]) window.history.replaceState(null, "", `/mappool/${stages[n].slug}`);
  };
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const stage = stages[i];
  if (!stage)
    return (
      <Container>
        <PageTitle mark="notes">{t.mappool.title}</PageTitle>
        <p className="py-10 text-center text-ash">{t.mappool.empty}</p>
      </Container>
    );
  const count = stage.pools.reduce((s, p) => s + p.maps.length, 0);

  return (
    <Container plain>
      <PageTitle mark="notes"
        right={
          <>
            <StageTabs options={stages.map((s) => t.rounds[s.title] ?? s.title)} index={i} onChange={pick} />
            {stage.pack ? (
              <SlantButton tone="balkan" download href={`/download/${stage.slug}`} className="px-3 py-1.5">
                <Download className="size-4" /> {t.mappool.pack(count)}
              </SlantButton>
            ) : (
              <span className="inline-flex -skew-x-12 items-center border border-dashed border-line px-3 py-1.5 text-sm font-black uppercase tracking-wide text-ash" title={t.mappool.packSoon}>
                <span className="inline-flex skew-x-12 items-center gap-2">
                  <Download className="size-4" /> {t.mappool.packSoon}
                </span>
              </span>
            )}
          </>
        }
      >
        {t.mappool.title}
      </PageTitle>

      <motion.div key={stage.slug} className="space-y-2.5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        {stage.pools.map((p, pi) => {
          const mod = MODS[p.category];
          const isOpen = !closed[p.category];
          const light = p.category === "Tiebreaker";
          return (
            <section key={p.category} style={{ "--i": pi, "--s": "0.09s" } as React.CSSProperties}>
              <button
                onClick={() => setClosed({ ...closed, [p.category]: isOpen })}
                className="group flex w-full items-stretch gap-2.5 text-left transition-transform duration-300 hover:translate-x-1"
                aria-expanded={isOpen}
              >
                <span className="in-pop flex w-8 items-center justify-center" style={{ background: mod.color }}>
                  <Play className={cn("size-4 fill-current transition-transform", isOpen && "rotate-90", light ? "text-ink" : "text-white")} />
                </span>
                <span
                  className={cn("in-grow flex flex-1 items-center justify-between px-3 py-1.5 font-black uppercase [--d:0.08s]", light ? "text-ink" : "text-white")}
                  style={{ background: mod.color }}
                >
                  {mod.label}
                  <span className="in-pop num text-lg opacity-80 [--d:0.4s]">{p.maps.length}</span>
                </span>
              </button>
              <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                <div className="mt-2 space-y-2 sm:pl-10">
                  {p.maps.map((m, k) => (
                    <motion.div
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.05 + k * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      key={m.slot} className="lift group relative flex h-20 items-stretch overflow-hidden border border-transparent bg-coal hover:border-line"
                      style={{ "--lift": mod.color, "--i": pi + k, "--s": "0.05s" } as React.CSSProperties}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.cover} alt="" className="in-wipe absolute inset-0 size-full object-cover opacity-30 transition duration-500 group-hover:scale-105 group-hover:opacity-45 [--d:0.15s]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
                      <span className="in-pop heading-slam relative flex w-14 shrink-0 items-center justify-center text-lg sm:w-24 sm:text-2xl [--d:0.3s]" style={{ color: mod.color }}>
                        {m.slot}
                      </span>
                      <div className="relative flex min-w-0 flex-1 flex-col justify-center">
                        <a href={osuMap(m.id)} target="_blank" rel="noreferrer" className="truncate text-base font-black transition-colors hover:text-[var(--lift)] sm:text-lg">
                          {m.title}
                        </a>
                        <span className="truncate text-xs text-paper/70 sm:text-sm">
                          [{m.version}] <span className="text-ash">by {m.creator}</span>
                        </span>
                        <span className="num mt-0.5 flex items-center gap-2 text-xs text-ash lg:hidden">
                          <span className="flex items-center gap-0.5 text-[#e8c547]">
                            <Star className="size-3 fill-current" /> {m.sr.toFixed(2)}
                          </span>
                          <span>{Math.round(m.bpm)}bpm</span>
                          <span>{fmtLen(m.length)}</span>
                        </span>
                      </div>
                      <div className="in-right num relative hidden shrink-0 items-center pr-6 text-base lg:grid lg:grid-cols-[4.25rem_5.25rem_3rem_3.5rem_3.5rem_3.5rem] [--d:0.35s]">
                        <span className="flex items-center justify-end gap-1 text-[#e8c547]">
                          <Star className="size-4 fill-current" /> {m.sr.toFixed(2)}
                        </span>
                        <span className="text-right">
                          {Math.round(m.bpm)} <span className="text-sm text-ash">bpm</span>
                        </span>
                        <span className="text-right">{fmtLen(m.length)}</span>
                        {(
                          [
                            ["CS", m.cs],
                            ["AR", m.ar],
                            ["OD", m.od],
                          ] as const
                        ).map(([k, val]) => (
                          <span key={k} className="text-right text-paper/80">
                            <span className="text-xs text-ash">{k}</span> {val}
                          </span>
                        ))}
                      </div>
                      <div className="in-right relative flex w-14 shrink-0 flex-col sm:w-36 [clip-path:polygon(14px_0,100%_0,100%_100%,0_100%)] [--d:0.45s]">
                        <a
                          href={`osu://b/${m.id}`}
                          title={t.mappool.direct}
                          aria-label={`${m.slot} ${t.mappool.direct}`}
                          className={cn("group/b flex flex-1 items-center justify-center pl-3 transition-[filter] hover:brightness-110", light ? "text-ink" : "text-white")}
                          style={{ background: mod.color }}
                        >
                          <span className={cn("heading-slam flex items-center gap-2 text-[0.95rem]", light ? "[text-shadow:0_1px_2px_rgb(255_255_255/0.35)]" : "[text-shadow:0_1px_3px_rgb(0_0_0/0.45)]")}>
                            <ArrowDownToLine className="size-4 drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-transform group-hover/b:translate-y-0.5" strokeWidth={3} />
                            <span className="hidden sm:inline">direct</span>
                          </span>
                        </a>
                        <a
                          href={osuMap(m.id)}
                          target="_blank"
                          rel="noreferrer"
                          title={t.mappool.page}
                          aria-label={`${m.slot} ${t.mappool.page}`}
                          className="group/b flex flex-1 items-center justify-center bg-ink/90 pl-1.5 transition-colors hover:bg-ink"
                          style={{ color: mod.color }}
                        >
                          <span className="heading-slam flex items-center gap-2 text-[0.95rem] [text-shadow:0_1px_3px_rgb(0_0_0/0.6)]">
                            <ArrowUpRight className="size-4 transition-transform group-hover/b:-translate-y-0.5 group-hover/b:translate-x-0.5" strokeWidth={3} />
                            <span className="hidden sm:inline">osu!</span>
                          </span>
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
                </motion.div>
              )}
              </AnimatePresence>
            </section>
          );
        })}
      </motion.div>
    </Container>
  );
}
