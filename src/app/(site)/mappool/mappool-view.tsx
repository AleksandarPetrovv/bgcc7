"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownToLine, ArrowUpRight, Download, Play, Star } from "lucide-react";
import { Container, PageTitle, SlantButton, StageTabs } from "@/components/site/page";
import { useDict } from "@/components/site/lang";
import { MODS, fmtLen, type Stage } from "@/lib/data";
import { osuMap } from "@/lib/links";
import { modHi, modOn } from "@/lib/theme";
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
              <span className="inline-flex -skew-x-12 items-center border border-dashed border-line px-3 py-1.5 text-sm font-display font-bold text-ash" title={t.mappool.packSoon}>
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

      {stage.info && <StageStrip key={`s-${stage.slug}`} stage={stage} info={stage.info} />}

      <motion.div key={stage.slug} className="space-y-2.5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        {stage.pools.map((p, pi) => {
          const skill = !!p.color;
          const mod = { label: MODS[p.category]?.label ?? p.category, color: p.color ?? MODS[p.category]?.color ?? "var(--rose)" };
          const isOpen = !closed[p.category];
          const light = modOn(mod.color) === "var(--on-fill)";
          return (
            <section key={p.category} style={{ "--i": pi, "--s": "0.09s" } as React.CSSProperties}>
              <button
                onClick={() => setClosed({ ...closed, [p.category]: isOpen })}
                className="group flex w-full items-stretch gap-2.5 text-left transition-transform duration-300 hover:translate-x-1"
                aria-expanded={isOpen}
              >
                <span className="in-pop flex w-8 items-center justify-center" style={{ background: mod.color }}>
                  <Play className={cn("size-4 fill-current transition-transform", isOpen && "rotate-90", light ? "text-paper" : "text-white")} />
                </span>
                <span
                  className={cn("in-grow flex flex-1 items-center justify-between px-3 py-1.5 font-display font-bold [--d:0.08s]", light ? "text-paper" : "text-white")}
                  style={{ background: mod.color }}
                >
                  {mod.label}
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
                  {p.maps.map((m, k) => {
                    const mc = skill ? mod.color : (MODS[m.mod]?.color ?? mod.color);
                    const ml = modOn(mc) === "var(--on-fill)";
                    return (
                    <motion.div
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.05 + k * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      key={m.slot} className="lift group relative flex items-stretch overflow-hidden border border-line bg-coal hover:border-rose/50"
                      style={{ "--lift": modHi(mc), "--i": pi + k, "--s": "0.05s" } as React.CSSProperties}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.cover} alt="" className="in-wipe absolute inset-0 size-full object-cover opacity-45 saturate-[1.15] transition duration-500 group-hover:scale-105 group-hover:opacity-60 dark:opacity-25 dark:group-hover:opacity-35 [--d:0.15s]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-coal via-coal/85 to-coal/5" />
                      <div className="relative grid min-w-0 flex-1 grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-3 sm:gap-x-5 sm:p-4 xl:flex xl:gap-6">
                      <span className="in-pop heading-slam shrink-0 text-lg sm:text-2xl [--d:0.3s]" style={{ color: modHi(mc) }}>
                        {m.slot}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <span className="flex min-w-0 items-center gap-2">
                          <a href={osuMap(m.id)} target="_blank" rel="noreferrer" className="truncate text-base font-display font-black transition-colors hover:text-[var(--lift)] sm:text-lg 2xl:text-xl">
                            {m.title}
                          </a>
                          {skill && m.mod !== "Tiebreaker" && MODS[m.mod] && (
                            <span className="shrink-0 -skew-x-12 border px-2 py-0.5 text-xs font-display font-black leading-4 sm:text-sm" style={{ borderColor: modHi(MODS[m.mod].color), color: modHi(MODS[m.mod].color) }}>
                              <span className="inline-block skew-x-12">{MODS[m.mod].short}</span>
                            </span>
                          )}
                        </span>
                        <span className="truncate text-xs text-ash sm:text-sm">
                          <span className="font-bold text-paper/90">[{m.version}]</span> by {m.creator}
                        </span>
                      </div>
                      <MapStats map={m} />
                      </div>
                      <div className="in-right relative flex w-14 shrink-0 flex-col sm:w-36 [clip-path:polygon(14px_0,100%_0,100%_100%,0_100%)] [--d:0.45s]">
                        <a
                          href={`osu://b/${m.id}`}
                          title={t.mappool.direct}
                          aria-label={`${m.slot} ${t.mappool.direct}`}
                          className={cn("group/b flex flex-1 items-center justify-center pl-3 transition-[filter] hover:brightness-110", ml ? "text-on-fill" : "text-white")}
                          style={{ background: mc }}
                        >
                          <span className={cn("heading-slam flex items-center gap-2 text-[0.95rem]", ml ? "[text-shadow:0_1px_2px_color-mix(in_srgb,var(--white)_35%,transparent)]" : "[text-shadow:0_1px_3px_color-mix(in_srgb,var(--black)_45%,transparent)]")}>
                            <ArrowDownToLine className="size-4 transition-transform group-hover/b:translate-y-0.5" strokeWidth={3} />
                            <span className="hidden sm:inline">direct</span>
                          </span>
                        </a>
                        <a
                          href={osuMap(m.id)}
                          target="_blank"
                          rel="noreferrer"
                          title={t.mappool.page}
                          aria-label={`${m.slot} ${t.mappool.page}`}
                          className="group/b flex flex-1 items-center justify-center bg-field/90 pl-1.5 transition-colors hover:bg-field"
                          style={{ color: modHi(mc) }}
                        >
                          <span className="heading-slam flex items-center gap-2 text-[0.95rem]">
                            <ArrowUpRight className="size-4 transition-transform group-hover/b:-translate-y-0.5 group-hover/b:translate-x-0.5" strokeWidth={3} />
                            <span className="hidden sm:inline">osu!</span>
                          </span>
                        </a>
                      </div>
                    </motion.div>
                    );
                  })}
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

function MapStats({ map }: { map: Stage["pools"][number]["maps"][number] }) {
  const stats = [["BPM", Math.round(map.bpm)], ["Length", fmtLen(map.length)], ["CS", map.cs], ["AR", map.ar], ["OD", map.od]] as const;
  return (
    <dl className="num col-span-2 grid grid-cols-3 items-center gap-x-3 gap-y-2 border-t border-line pt-2.5 text-center text-paper [text-shadow:0_1px_2px_color-mix(in_srgb,var(--ink)_85%,transparent)] sm:grid-cols-6 sm:gap-x-4 xl:w-[27rem] xl:shrink-0 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0 2xl:w-[31rem]">
      <div>
        <dt className="sr-only">SR</dt>
        <dd className="flex items-center justify-center gap-1 text-sm font-black text-gold-hi xl:text-lg">
          <Star className="size-3.5 shrink-0 fill-current" />{map.sr.toFixed(2)}
        </dd>
      </div>
      {stats.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-[0.6rem] font-bold text-paper/80 sm:text-[0.65rem]">{label}</dt>
          <dd className="whitespace-nowrap text-xs font-black sm:text-sm xl:text-base">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const EASE = [0.16, 1, 0.3, 1] as const;

function useCount(to: number, ms = 900) {
  const [v, setV] = useState(to);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setV(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

function StageStrip({ stage, info }: { stage: Stage; info: { firstTo: number; bans: number } }) {
  const t = useDict();
  const maps = stage.pools.flatMap((p) => p.maps);
  const n = maps.length || 1;
  const sr = useCount(maps.reduce((s, m) => s + m.sr, 0) / n);
  const ft = useCount(info.firstTo, 700);
  const total = useCount(maps.length, 700);
  const cells: { label: string; val: React.ReactNode; sub?: React.ReactNode; accent: string }[] = [
    {
      label: t.mappool.firstTo,
      val: Math.round(ft),
      sub: (
        <>
          <span className="num">{info.bans}</span> {t.mappool.bans(info.bans)}
        </>
      ),
      accent: "var(--balkan)",
    },
    { label: t.mappool.maps, val: Math.round(total), accent: "var(--rose)" },
    {
      label: t.mappool.avgSr,
      val: (
        <span className="flex items-center gap-1.5">
          <Star className="size-5 fill-current text-gold-hi sm:size-6" />
          {sr.toFixed(2)}
        </span>
      ),
      accent: "var(--gold)",
    },
  ];

  return (
    <motion.div className="mb-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="grid grid-cols-3 gap-px bg-line">
        {cells.map((c, k) => (
          <motion.div
            key={c.label}
            className="group relative flex flex-col justify-center overflow-hidden bg-coal px-3 py-3 sm:px-5 sm:py-4"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: k * 0.08, ease: EASE }}
          >
            <motion.span
                className="absolute inset-x-0 top-0 h-0.5 origin-left"
                style={{ background: c.accent }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.2 + k * 0.08, ease: EASE }}
              />
            <span className="text-[0.65rem] font-display font-bold text-ash sm:text-xs">{c.label}</span>
            <span className="heading-slam num text-3xl leading-tight sm:text-4xl">{c.val}</span>
            {c.sub && <span className="text-[0.7rem] font-display font-bold text-paper/60 sm:text-xs">{c.sub}</span>}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
