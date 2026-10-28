"use client";

import { motion } from "motion/react";
import { Notes } from "@/components/site/page";
import { MODS } from "@/lib/data";
import { modHi, modOn } from "@/lib/theme";
import type { FeedMap, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { Backdrop, editionNum, LABEL, Lockup, ScoreNum, TEAM, TeamPlate } from "./chrome";

const GROUPS = ["NoMod", "Hidden", "HardRock", "DoubleTime", "Tiebreaker"] as const;
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

function groupFor(map: FeedMap) {
  const mod = norm(map.mod);
  const hit = GROUPS.find((k) => [k, MODS[k].short, MODS[k].label].some((v) => norm(v) === mod));
  if (hit) return hit;
  const prefix = map.slot.trim().match(/^[a-z]+/i)?.[0].toLowerCase();
  return GROUPS.find((k) => MODS[k].short.toLowerCase() === prefix);
}

export function MappoolScene({ feed }: { feed: OverlayFeed }) {
  const bySlot = new Map(feed.pool.map((m) => [norm(m.slot), m]));
  const groups: { key: string; short: string; label: string; color: string; maps: FeedMap[] }[] = feed.groups?.length
    ? feed.groups.map((g) => ({ key: g.name, short: g.name.charAt(0).toUpperCase() + g.name.slice(1).toLowerCase(), label: "", color: g.color, maps: g.slots.flatMap((x) => bySlot.get(norm(x)) ?? []) })).filter((g) => g.maps.length)
    : GROUPS.map((key) => ({ key, ...MODS[key], maps: feed.pool.filter((m) => groupFor(m) === key) })).filter((g) => g.maps.length);
  const steps = new Map(feed.steps.map((s) => [norm(s.slot), s]));
  let rows = 4;
  while (rows < 12 && groups.reduce((n, g) => n + Math.ceil(g.maps.length / rows), 0) > 6) rows++;
  rows = Math.min(rows, Math.max(1, ...groups.map((g) => g.maps.length)));
  const spans = groups.map((g) => Math.max(1, Math.ceil(g.maps.length / rows)));
  const cardH = Math.min(122, Math.floor((640 - (rows - 1) * 12) / rows));
  const modColor = (slot: string) => Object.values(MODS).find((m) => slot.toUpperCase().replace(/\d+$/, "") === m.short)?.color;
  const nowSlot = feed.current ? norm(feed.current.slot) : null;
  const skill = !!feed.groups?.length;

  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={editionNum(feed)} tint="var(--rose)" />

      <header className="absolute inset-x-[72px] top-[44px] grid grid-cols-[1fr_auto_1fr] items-center gap-8">
        <TeamPlate team={feed.teams[0]} side={0} className="max-w-[640px] justify-self-start" />
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            {[0, 1].map((i) => (
              <span key={i} className="inline-flex -skew-x-12 px-5 py-1" style={{ background: TEAM[i].c, boxShadow: `6px 6px 0 0 ${TEAM[i].deep}` }}>
                <ScoreNum value={feed.match.score[i]} side={i as 0 | 1} className="num skew-x-12 font-display text-[64px] font-black leading-none text-white" />
              </span>
            ))}
          </div>
          <span className={LABEL}>First to {feed.match.firstTo}</span>
        </div>
        <TeamPlate team={feed.teams[1]} side={1} className="max-w-[640px] justify-self-end" />
      </header>

      <div className="absolute inset-x-[72px] top-[205px] flex items-end justify-between border-b border-line pb-4">
        <div className="flex items-center gap-5">
          <span className="flex text-[72px] leading-none"><Notes /></span>
          <h1 className="font-display text-[48px] font-black italic uppercase leading-none">Mappool</h1>
        </div>
        <Lockup num={editionNum(feed)} size={30} />
      </div>

      <div className="absolute inset-x-[72px] top-[300px] grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.max(1, spans.reduce((a, b) => a + b, 0))}, minmax(0, 1fr))` }}>
        {groups.map((g, gi) => (
          <section key={g.key} className="flex min-w-0 flex-col gap-3" style={{ gridColumn: `span ${spans[gi]}` }}>
            <h2 className="flex items-center gap-3 pb-1">
              <span className="inline-flex -skew-x-12 px-3 py-0.5" style={{ background: g.color }}>
                <span className="skew-x-12 text-[18px] font-black" style={{ color: modOn(g.color) }}>{g.short}</span>
              </span>
              {g.label && <span className={LABEL}>{g.label}</span>}
            </h2>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${spans[gi]}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, ${cardH}px)`, gridAutoFlow: "column" }}>
            {g.maps.map((map, mi) => {
              const step = steps.get(norm(map.slot));
              const ban = step?.kind === "ban";
              const pick = step?.kind === "pick";
              const now = !ban && nowSlot === norm(map.slot);
              const done = ban || (pick && !now);
              const mk = groupFor(map);
              const team = step ? TEAM[step.team - 1] : null;
              const won = pick && step.winner ? step.winner : null;
              const stamp = step && team && !now ? { word: ban ? "Banned" : won ? "Won" : "Picked", side: won ? TEAM[won - 1] : team, name: feed.teams[(won ?? step.team) - 1].name } : null;
              return (
                <motion.article
                  key={`${map.slot}-${map.id}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: gi * 0.06 + mi * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden border-2 bg-coal transition-[border-color,box-shadow] duration-500"
                  style={{
                    height: cardH,
                    borderColor: now ? "var(--gold)" : "var(--line)",
                    boxShadow: now ? "0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent), 6px 6px 0 0 var(--gold-deep)" : "4px 4px 0 0 color-mix(in srgb, var(--rose-deep) 42%, transparent)",
                  }}
                >
                  <div className={cn("absolute inset-0 transition-[filter,opacity] duration-500", done && "opacity-15 grayscale")} aria-hidden>
                    {map.cover && <div className="absolute -inset-3 bg-cover bg-center opacity-45 blur-[3px]" style={{ backgroundImage: `url(${JSON.stringify(map.cover)})` }} />}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--ink)_95%,transparent)_30%,color-mix(in_srgb,var(--ink)_55%,transparent))]" />
                  </div>
                  {!now && <span className={cn("absolute inset-y-0 left-0 w-[6px]", done && "opacity-25 grayscale")} style={{ background: g.color }} aria-hidden />}
                  {pick && team && !now && (
                    <motion.svg
                      className="pointer-events-none absolute inset-0 z-10 size-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{ filter: `drop-shadow(3px 3px 0 ${team.deep})` }}
                      initial={{ clipPath: "inset(0 100% 0 0)" }}
                      animate={{ clipPath: "inset(0 0% 0 0)" }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      aria-hidden
                    >
                      <line x1="2" y1="88" x2="98" y2="12" stroke={team.c} strokeWidth="8" vectorEffect="non-scaling-stroke" />
                    </motion.svg>
                  )}
                  {stamp && (
                    <motion.div
                      key={stamp.word}
                      className="absolute inset-0 z-20 flex items-center justify-center"
                      initial={{ scale: 2.2, opacity: 0, rotate: -20 }}
                      animate={{ scale: 1, opacity: 1, rotate: -8 }}
                      transition={{ type: "spring", stiffness: 420, damping: 18 }}
                    >
                      <span className="flex flex-col items-center border-[3px] bg-ink/85 px-4 py-1" style={{ borderColor: stamp.side.c, boxShadow: `4px 4px 0 0 ${stamp.side.deep}` }}>
                        <span className="font-display text-[26px] font-black italic uppercase leading-none" style={{ color: stamp.side.hi }}>
                          {stamp.word}
                        </span>
                        <span className="max-w-[200px] truncate text-[13px] font-display font-bold text-paper/80">{stamp.name}</span>
                      </span>
                    </motion.div>
                  )}
                  {pick && team && !now && (
                    <motion.span
                      key={`flash-${map.slot}`}
                      className="pointer-events-none absolute inset-0"
                      style={{ background: team.c }}
                      initial={{ opacity: 0.55 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      aria-hidden
                    />
                  )}
                  <div className={cn("relative flex h-full flex-col justify-center gap-1 pl-5 pr-3 transition-opacity duration-500", done && "opacity-25 grayscale")}>
                    <div className="flex items-center gap-2">
                      <span className="-ml-[3px] font-display text-[30px] font-black italic leading-none" style={{ color: modHi(modColor(map.slot) ?? g.color) }}>
                        {map.slot}
                      </span>
                      {skill && mk && mk !== "Tiebreaker" && (
                        <span className="absolute right-2.5 top-2 -skew-x-12 border px-1.5 text-[13px] font-display font-black leading-5" style={{ borderColor: modHi(MODS[mk].color), color: modHi(MODS[mk].color) }}>
                          <span className="inline-block skew-x-12">{MODS[mk].short}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="truncate text-[19px] font-black leading-tight">{map.title}</h3>
                    {cardH >= 96 && <p className="truncate pr-16 text-[14px] font-bold text-ash">[{map.version}]</p>}
                  </div>
                  <span className={cn("num absolute bottom-2 right-3 text-[16px] font-black text-gold-hi transition-opacity duration-500", done && "opacity-25")}>{map.sr.toFixed(2)}★</span>
                </motion.article>
              );
            })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
