"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useDict } from "./lang";
import { fmtNum, MODS } from "@/lib/data";
import { slotColor } from "@/lib/format-plan";

type Props = {
  score: number;
  acc: number;
  combo: number;
  miss: number;
  mods: string[];
  rank: string;
  map: { slot: string | null; mod: string | null; title: string; version: string; cover: string };
};

export function BestScore({ score, acc, combo, miss, mods, rank, map }: Props) {
  const t = useDict();
  const color = (map.slot && slotColor(map.slot)) || (map.mod && MODS[map.mod]?.color) || "var(--color-rose-hi)";
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={0}
        closeDelay={0}
        render={
          <span tabIndex={0} className="num mt-1 block w-fit cursor-default text-2xl leading-none text-rose-hi transition-colors hover:text-paper sm:text-3xl">
            {fmtNum(score)}
          </span>
        }
      />
      <HoverCardContent side="top" align="start" className="w-[300px] rounded-none border border-balkan bg-ink p-0 text-paper shadow-2xl shadow-black/60 ring-0">
        <div className="relative h-16 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={map.cover} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
          <div className="relative flex h-full flex-col justify-end bg-gradient-to-t from-ink to-transparent px-3 pb-1.5">
            {map.slot && (
              <span className="text-[0.65rem] font-black uppercase" style={{ color }}>
                {map.slot}
              </span>
            )}
            <span className="truncate text-sm font-black">
              {map.title} <span className="font-bold text-paper/60">[{map.version}]</span>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line text-sm">
          {[
            [t.qual.detail[0], fmtNum(score), "text-balkan"],
            [t.qual.detail[1], `${(acc * 100).toFixed(2)}%`, "text-paper"],
            [t.match.combo, `${fmtNum(combo)}x`, "text-paper"],
            [t.match.miss, String(miss), miss ? "text-rose-hi" : "text-paper"],
            [t.qual.detail[4], mods.length ? mods.join("") : "NM", "text-paper"],
            [t.qual.detail[5], rank || "—", "text-paper"],
          ].map(([k, v, c]) => (
            <div key={k} className="flex items-center justify-between gap-2 bg-coal px-3 py-2">
              <span className="text-[0.65rem] font-black uppercase text-ash">{k}</span>
              <span className={`num whitespace-nowrap text-base ${c}`}>{v}</span>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
