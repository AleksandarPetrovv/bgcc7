"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Play, Sheet, Star } from "lucide-react";
import { Container, PageTitle, SlantButton, StageTabs } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import { MODS, fmtLen, type Stage } from "@/lib/data";
import { osuMap } from "@/lib/links";
import { cn } from "@/lib/utils";

export function MappoolView({ stages, links }: { stages: Stage[]; links: Record<string, string> }) {
  const t = useDict();
  const [i, setI] = useState(Math.max(0, stages.length - 1));
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const stage = stages[i];
  if (!stage)
    return (
      <Container>
        <PageTitle>{t.mappool.title}</PageTitle>
        <p className="py-10 text-center text-ash">{t.mappool.empty}</p>
      </Container>
    );
  const count = stage.pools.reduce((s, p) => s + p.maps.length, 0);

  return (
    <Container plain>
      <PageTitle
        right={
          <>
            <StageTabs options={stages.map((s) => t.rounds[s.title] ?? s.title)} index={i} onChange={setI} />
            {links.sheets && (
              <SlantButton tone="rose" href={links.sheets} className="px-3 py-1.5">
                <Sheet className="size-4" /> {t.common.sheets}
              </SlantButton>
            )}
            {stage.pack && (
              <SlantButton tone="balkan" download href={`/download/${stage.slug}`} className="px-3 py-1.5">
                <Download className="size-4" /> {t.mappool.pack(count)}
              </SlantButton>
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
                <div className="mt-2 space-y-2 pl-10">
                  {p.maps.map((m, k) => (
                    <motion.a
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.05 + k * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      key={m.slot} href={osuMap(m.id)} target="_blank" rel="noreferrer" aria-label={`${m.slot} ${m.title}, ${t.common.openMap}`} className="lift group relative flex h-20 items-stretch overflow-hidden border border-transparent bg-coal hover:border-line"
                      style={{ "--lift": mod.color, "--i": pi + k, "--s": "0.05s" } as React.CSSProperties}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.cover} alt="" className="in-wipe absolute inset-0 size-full object-cover opacity-30 transition duration-500 group-hover:scale-105 group-hover:opacity-45 [--d:0.15s]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
                      <span className="in-pop heading-slam relative flex w-24 shrink-0 items-center justify-center text-2xl [--d:0.3s]" style={{ color: mod.color }}>
                        {m.slot}
                      </span>
                      <div className="relative flex min-w-0 flex-1 flex-col justify-center">
                        <span className="truncate text-lg font-black">{m.title}</span>
                        <span className="truncate text-sm text-paper/70">
                          [{m.version}] <span className="text-ash">by {m.creator}</span>
                        </span>
                      </div>
                      <div className="in-right num relative hidden items-center gap-5 pr-5 text-base sm:flex [--d:0.35s]">
                        <span className="flex items-center gap-1 text-[#e8c547]">
                          <Star className="size-4 fill-current" /> {m.sr.toFixed(2)}
                        </span>
                        <span>{Math.round(m.bpm)} bpm</span>
                        <span>{fmtLen(m.length)}</span>
                        <span className="text-ash">
                          CS {m.cs} · AR {m.ar} · OD {m.od}
                        </span>
                      </div>
                    </motion.a>
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
