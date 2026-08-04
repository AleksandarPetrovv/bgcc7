"use client";

import { useState } from "react";
import { Download, Play, Sheet, Star } from "lucide-react";
import { Container, PageTitle, SlantButton, StageTabs } from "@/components/site/page";
import { MODS, stages, fmtLen } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function Mappool() {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({ NoMod: true, Hidden: true });
  const stage = stages[i];
  const count = stage.pools.reduce((s, p) => s + p.maps.length, 0);

  return (
    <Container className="max-w-5xl">
      <PageTitle
        right={
          <>
            <StageTabs options={stages.map((s) => s.title.replace("-", " "))} index={i} onChange={setI} />
            <SlantButton tone="rose" className="px-3 py-1.5">
              <Sheet className="size-4" /> Sheets
            </SlantButton>
            <SlantButton tone="balkan" className="px-3 py-1.5">
              <Download className="size-4" /> Pack · {count} maps
            </SlantButton>
          </>
        }
      >
        Mappool
      </PageTitle>

      <div className="space-y-2.5">
        {stage.pools.map((p) => {
          const mod = MODS[p.category];
          const isOpen = open[p.category];
          const light = p.category === "Tiebreaker";
          return (
            <section key={p.category}>
              <button
                onClick={() => setOpen({ ...open, [p.category]: !isOpen })}
                className="flex w-full items-stretch gap-2.5 text-left"
                aria-expanded={isOpen}
              >
                <span className="flex w-8 items-center justify-center" style={{ background: mod.color }}>
                  <Play className={cn("size-4 fill-current transition-transform", isOpen && "rotate-90", light ? "text-ink" : "text-white")} />
                </span>
                <span
                  className={cn("flex flex-1 items-center justify-between px-3 py-1.5 font-black uppercase", light ? "text-ink" : "text-white")}
                  style={{ background: mod.color }}
                >
                  {mod.label}
                  <span className="num text-lg opacity-80">{p.maps.length}</span>
                </span>
              </button>
              {isOpen && (
                <div className="mt-2 space-y-2 pl-10">
                  {p.maps.map((m) => (
                    <div key={m.slot} className="group relative flex h-20 items-stretch overflow-hidden bg-coal">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.cover} alt="" className="absolute inset-0 size-full object-cover opacity-30 transition duration-500 group-hover:scale-105 group-hover:opacity-45" />
                      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
                      <span className="heading-slam relative flex w-24 shrink-0 items-center justify-center text-2xl" style={{ color: mod.color }}>
                        {m.slot}
                      </span>
                      <div className="relative flex min-w-0 flex-1 flex-col justify-center">
                        <span className="truncate text-lg font-black">{m.title}</span>
                        <span className="truncate text-sm text-paper/70">
                          [{m.version}] <span className="text-ash">by {m.creator}</span>
                        </span>
                      </div>
                      <div className="num relative hidden items-center gap-5 pr-5 text-base sm:flex">
                        <span className="flex items-center gap-1 text-[#e8c547]">
                          <Star className="size-4 fill-current" /> {m.sr.toFixed(2)}
                        </span>
                        <span>{Math.round(m.bpm)} bpm</span>
                        <span>{fmtLen(m.length)}</span>
                        <span className="text-ash">
                          CS {m.cs} · AR {m.ar} · OD {m.od}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Container>
  );
}
