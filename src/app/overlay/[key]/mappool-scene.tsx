"use client";

import { motion } from "motion/react";
import { TriTick } from "@/components/site/graphics";
import { MODS } from "@/lib/data";
import type { FeedMap, OverlayFeed } from "@/lib/overlay-types";
import { cn } from "@/lib/utils";
import { Backdrop, editionNum, Lockup, TEAM, TeamPlate } from "./chrome";

const GROUPS = ["NoMod", "Hidden", "HardRock", "DoubleTime", "Tiebreaker"] as const;
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

function groupFor(map: FeedMap) {
  const mod = norm(map.mod);
  const hit = GROUPS.find((k) => [k, MODS[k].short, MODS[k].label].some((v) => norm(v) === mod));
  if (hit) return hit;
  const prefix = map.slot.trim().match(/^[a-z]+/i)?.[0].toLowerCase();
  return GROUPS.find((k) => MODS[k].short.toLowerCase() === prefix);
}

function Tag({ text, color, dark }: { text: string; color: string; dark?: boolean }) {
  return (
    <span className="inline-flex -skew-x-12 px-2 py-0.5" style={{ background: color }}>
      <span className={cn("skew-x-12 text-[13px] font-black uppercase tracking-[0.12em]", dark ? "text-ink" : "text-white")}>{text}</span>
    </span>
  );
}

export function MappoolScene({ feed }: { feed: OverlayFeed }) {
  const bySlot = new Map(feed.pool.map((m) => [norm(m.slot), m]));
  const groups: { key: string; short: string; label: string; color: string; maps: FeedMap[] }[] = feed.groups?.length
    ? feed.groups.map((g) => ({ key: g.name, short: g.name, label: "", color: g.color, maps: g.slots.flatMap((x) => bySlot.get(norm(x)) ?? []) })).filter((g) => g.maps.length)
    : GROUPS.map((key) => ({ key, ...MODS[key], maps: feed.pool.filter((m) => groupFor(m) === key) })).filter((g) => g.maps.length);
  const steps = new Map(feed.steps.map((s) => [norm(s.slot), s]));
  let rows = 3;
  while (rows < 12 && groups.reduce((n, g) => n + Math.ceil(g.maps.length / rows), 0) > 6) rows++;
  rows = Math.min(rows, Math.max(1, ...groups.map((g) => g.maps.length)));
  const spans = groups.map((g) => Math.max(1, Math.ceil(g.maps.length / rows)));
  const cardH = Math.min(122, Math.floor((640 - (rows - 1) * 12) / rows));
  const modColor = (slot: string) => Object.values(MODS).find((m) => slot.toUpperCase().replace(/\d+$/, "") === m.short)?.color;
  const nowSlot = feed.current ? norm(feed.current.slot) : null;

  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={editionNum(feed)} tint="var(--color-rose)" />

      <header className="absolute inset-x-[72px] top-[44px] grid grid-cols-[1fr_auto_1fr] items-center gap-8">
        <TeamPlate team={feed.teams[0]} side={0} className="max-w-[640px] justify-self-start" />
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            {[0, 1].map((i) => (
              <span key={i} className="inline-flex -skew-x-12 px-5 py-1" style={{ background: TEAM[i].c, boxShadow: `6px 6px 0 0 ${TEAM[i].deep}` }}>
                <span className="num skew-x-12 font-display text-[64px] font-black leading-none text-white">{feed.match.score[i]}</span>
              </span>
            ))}
          </div>
          <span className="text-[15px] font-black uppercase tracking-[0.22em] text-ash">First to {feed.match.firstTo}</span>
        </div>
        <TeamPlate team={feed.teams[1]} side={1} className="max-w-[640px] justify-self-end" />
      </header>

      <div className="absolute inset-x-[72px] top-[205px] flex items-end justify-between border-b border-line pb-4">
        <div className="flex items-center gap-5">
          <TriTick className="h-[24px] w-[46px]" />
          <h1 className="font-display text-[48px] font-black italic uppercase leading-none">Mappool</h1>
          <span className="text-[20px] font-black uppercase tracking-[0.16em] text-ash">{feed.match.round}</span>
        </div>
        <Lockup num={editionNum(feed)} size={30} />
      </div>

      <div className="absolute inset-x-[72px] top-[300px] grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.max(1, spans.reduce((a, b) => a + b, 0))}, minmax(0, 1fr))` }}>
        {groups.map((g, gi) => (
          <section key={g.key} className="flex min-w-0 flex-col gap-3" style={{ gridColumn: `span ${spans[gi]}` }}>
            <h2 className="flex items-center gap-3 pb-1">
              <span className="inline-flex -skew-x-12 px-3 py-0.5" style={{ background: g.color }}>
                <span className="skew-x-12 text-[18px] font-black text-ink">{g.short}</span>
              </span>
              <span className="text-[15px] font-black uppercase tracking-[0.16em] text-ash">{g.label || g.maps.length}</span>
            </h2>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${spans[gi]}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, ${cardH}px)`, gridAutoFlow: "column" }}>
            {g.maps.map((map, mi) => {
              const step = steps.get(norm(map.slot));
              const ban = step?.kind === "ban";
              const pick = step?.kind === "pick";
              const won = pick && step.winner ? step.winner : null;
              const now = !ban && nowSlot === norm(map.slot);
              const team = step ? TEAM[step.team - 1] : null;
              return (
                <motion.article
                  key={`${map.slot}-${map.id}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: gi * 0.06 + mi * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("relative overflow-hidden border-2 bg-coal", ban && "opacity-40 grayscale")}
                  style={{
                    height: cardH,
                    borderColor: now ? "var(--color-gold)" : pick && team ? team.c : "var(--color-line)",
                    boxShadow: now ? "0 0 0 3px rgba(232,197,71,0.35), 6px 6px 0 0 var(--color-gold-deep)" : pick && team ? `6px 6px 0 0 ${team.deep}` : "4px 4px 0 0 rgba(0,0,0,0.5)",
                  }}
                >
                  {map.cover && <div className="absolute inset-0 bg-cover bg-center opacity-45" style={{ backgroundImage: `url(${JSON.stringify(map.cover)})` }} aria-hidden />}
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,15,14,0.95)_30%,rgba(13,15,14,0.55))]" aria-hidden />
                  <span className="absolute inset-y-0 left-0 w-[6px]" style={{ background: g.color }} aria-hidden />
                  {ban && <span className="absolute left-0 top-1/2 h-[3px] w-[140%] origin-left -rotate-[8deg]" style={{ background: team?.c }} aria-hidden />}
                  <div className="relative flex h-full flex-col justify-center gap-1 pl-5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[30px] font-black italic leading-none" style={{ color: modColor(map.slot) ?? g.color }}>
                        {map.slot}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        {now && <Tag text="Now" color="var(--color-gold)" dark />}
                        {ban && team && <Tag text="Ban" color={team.c} />}
                        {pick && team && !won && !now && <Tag text="Pick" color={team.c} />}
                        {won && <Tag text="Win" color={TEAM[won - 1].c} />}
                        <span className="num text-[16px] font-black text-gold">{map.sr.toFixed(2)}★</span>
                      </span>
                    </div>
                    <h3 className="truncate text-[19px] font-black leading-tight">{map.title}</h3>
                    {cardH >= 96 && <p className="truncate text-[14px] font-bold text-ash">{map.version}</p>}
                  </div>
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
