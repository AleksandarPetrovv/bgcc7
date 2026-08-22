"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, ExternalLink, Play, Sheet, Star, Zap } from "lucide-react";
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
        <PageTitle mark="cards">{t.mappool.title}</PageTitle>
        <p className="py-10 text-center text-ash">{t.mappool.empty}</p>
      </Container>
    );
  const count = stage.pools.reduce((s, p) => s + p.maps.length, 0);

  return (
    <Container plain>
      <PageTitle mark="cards"
        right={
          <>
            <StageTabs options={stages.map((s) => t.rounds[s.title] ?? s.title)} index={i} onChange={setI} />
            {links.sheets && (
              <SlantButton tone="rose" href={links.sheets} className="px-3 py-1.5">
                <Sheet className="size-4" /> {t.common.sheets}
              </SlantButton>
            )}
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
                <div className="mt-2 space-y-2 pl-10">
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
                      <span className="in-pop heading-slam relative flex w-24 shrink-0 items-center justify-center text-2xl [--d:0.3s]" style={{ color: mod.color }}>
                        {m.slot}
                      </span>
                      <div className="relative flex min-w-0 flex-1 flex-col justify-center">
                        <a href={osuMap(m.id)} target="_blank" rel="noreferrer" className="truncate text-lg font-black transition-colors hover:text-[var(--lift)]">
                          {m.title}
                        </a>
                        <span className="truncate text-sm text-paper/70">
                          [{m.version}] <span className="text-ash">by {m.creator}</span>
                        </span>
                      </div>
                      <div className="in-right num relative hidden items-center gap-5 pr-4 text-base lg:flex [--d:0.35s]">
                        <span className="flex items-center gap-1 text-[#e8c547]">
                          <Star className="size-4 fill-current" /> {m.sr.toFixed(2)}
                        </span>
                        <span>{Math.round(m.bpm)} bpm</span>
                        <span>{fmtLen(m.length)}</span>
                        <span className="text-ash">
                          CS {m.cs} · AR {m.ar} · OD {m.od}
                        </span>
                      </div>
                      <div className="in-right relative flex shrink-0 flex-col justify-center gap-1.5 pr-3 [--d:0.45s]">
                        <a
                          href={osuMap(m.id)}
                          target="_blank"
                          rel="noreferrer"
                          title={t.mappool.page}
                          aria-label={`${m.slot} ${t.mappool.page}`}
                          className="flex h-7 -skew-x-12 items-center gap-1.5 border border-line bg-ink/80 px-2.5 text-[0.65rem] font-black uppercase tracking-wide text-paper/80 transition hover:border-[var(--lift)] hover:text-paper"
                        >
                          <span className="flex skew-x-12 items-center gap-1.5">
                            <ExternalLink className="size-3.5" /> <span className="hidden sm:inline">osu!</span>
                          </span>
                        </a>
                        <a
                          href={`osu://b/${m.id}`}
                          title={t.mappool.direct}
                          aria-label={`${m.slot} ${t.mappool.direct}`}
                          className="flex h-7 -skew-x-12 items-center gap-1.5 border border-transparent px-2.5 text-[0.65rem] font-black uppercase tracking-wide text-ink transition hover:brightness-110"
                          style={{ background: mod.color }}
                        >
                          <span className={cn("flex skew-x-12 items-center gap-1.5", !light && "text-white")}>
                            <Zap className="size-3.5 fill-current" /> <span className="hidden sm:inline">direct</span>
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
