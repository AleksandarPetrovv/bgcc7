"use client";

import { useState } from "react";
import type { Match } from "@/lib/data";
import { useTournament } from "./tournament";
import { sourceLabel } from "@/lib/matches";
import { useDict } from "./lang";
import { cn } from "@/lib/utils";

export const W = 214;
export const G = 52;
export const H = 78;
export const LB = 520;
export const x = (c: number) => c * (W + G);

export const POS: Record<string, [number, number]> = {
  "WB-R1-M1": [0, 0], "WB-R1-M2": [0, 100], "WB-R1-M3": [0, 200], "WB-R1-M4": [0, 300],
  "WB-R2-M1": [1, 50], "WB-R2-M2": [1, 250],
  "WB-R3-M1": [2, 150],
  "LB-R1-M1": [0, LB], "LB-R1-M2": [0, LB + 100],
  "LB-R2-M1": [1, LB], "LB-R2-M2": [1, LB + 100],
  "LB-R3-M1": [2, LB + 50],
  "LB-R4-M1": [3, LB + 50],
  "GF-M1": [4, 300], "GF-M2": [4, 400],
};

export const WIN: Record<string, string> = {
  "WB-R1-M1": "WB-R2-M1", "WB-R1-M2": "WB-R2-M1", "WB-R1-M3": "WB-R2-M2", "WB-R1-M4": "WB-R2-M2",
  "WB-R2-M1": "WB-R3-M1", "WB-R2-M2": "WB-R3-M1", "WB-R3-M1": "GF-M1",
  "LB-R1-M1": "LB-R2-M1", "LB-R1-M2": "LB-R2-M2", "LB-R2-M1": "LB-R3-M1", "LB-R2-M2": "LB-R3-M1",
  "LB-R3-M1": "LB-R4-M1", "LB-R4-M1": "GF-M1",
};

const DROP_SOURCES: Record<string, string> = {
  "LB-R1-M1.team1": "WB-R1-M1",
  "LB-R1-M1.team2": "WB-R1-M4",
  "LB-R1-M2.team1": "WB-R1-M2",
  "LB-R1-M2.team2": "WB-R1-M3",
  "LB-R2-M1.team1": "WB-R2-M2",
  "LB-R2-M2.team1": "WB-R2-M1",
  "LB-R4-M1.team1": "WB-R3-M1",
};
const DROPS = Object.entries(DROP_SOURCES).map(([to, from]) => ({ from, to: to.split(".")[0] }));

export const HEADERS = [
  { c: 0, y: -34, t: "Round 1 (Quarter-Finals)" },
  { c: 1, y: -34, t: "Round 2 (Semi-Finals)" },
  { c: 2, y: -34, t: "Winners Finals" },
  { c: 4, y: 266, t: "Grand Finals", gold: true },
  { c: 0, y: LB - 34, t: "Losers Round 1" },
  { c: 1, y: LB - 34, t: "Losers Round 2" },
  { c: 2, y: LB - 34, t: "Losers Round 3" },
  { c: 3, y: LB - 34, t: "Losers Finals" },
];



function Slot({ m, slot }: { m: Match; slot: 1 | 2 }) {
  const t = useDict();
  const { teamById, matches } = useTournament();
  const s = slot === 1 ? m.team1 : m.team2;
  const team = teamById(s.id);
  const won = m.winner === slot;
  const lost = m.winner !== null && !won;
  return (
    <div className={cn("flex h-[29px] items-center gap-2 px-2", won ? "bg-balkan/15" : "", lost && "opacity-50")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {team ? <img src={team.image} alt="" className="size-5 object-cover" /> : <span className="size-5 bg-slate" />}
      <span className={cn("min-w-0 flex-1 truncate text-[0.82rem]", team ? "font-bold" : "italic text-ash", won && "text-balkan")}>
        {team ? team.name : sourceLabel(t, matches, m.id, slot)}
      </span>
      <span className={cn("num w-5 text-right text-lg", won ? "text-balkan" : "text-paper/80")}>{m.winner ? (s.score ?? 0) : ""}</span>
    </div>
  );
}

export function BracketView() {
  const t = useDict();
  const { matchById } = useTournament();
  const [hover, setHover] = useState<string | null>(null);
  const linked = new Set<string>();
  if (hover) {
    for (const d of DROPS) if (d.from === hover || d.to === hover) linked.add(d.from).add(d.to);
  }
  const width = x(4) + W;
  const height = LB + 100 + H + 8;

  const pathWin = (a: string, b: string) => {
    const [ca, ya] = POS[a];
    const [cb, yb] = POS[b];
    const x1 = x(ca) + W, y1 = ya + H / 2, x2 = x(cb), y2 = yb + H / 2;
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} H${mx} V${y2} H${x2}`;
  };
  const pathDrop = (a: string, b: string) => {
    const [ca, ya] = POS[a];
    const [cb, yb] = POS[b];
    const x1 = x(ca) + W / 2, y1 = ya + H, x2 = x(cb) + W / 2, y2 = yb;
    return `M${x1} ${y1} C${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
  };

  return (
    <div className="overflow-x-auto overflow-y-hidden pb-4">
      <div className="relative mx-auto mt-10" style={{ width, height }}>
        <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
          {Object.entries(WIN).map(([a, b]) => (
            <path key={a} d={pathWin(a, b)} fill="none" stroke="#2b302d" strokeWidth={2} />
          ))}
          {DROPS.map((d) => (
            <path
              key={d.from + d.to}
              d={pathDrop(d.from, d.to)}
              fill="none"
              stroke="#e0242f"
              strokeWidth={2.25}
              strokeDasharray="5 4"
              className="transition-opacity duration-150"
              opacity={hover && (d.from === hover || d.to === hover) ? 0.9 : 0}
            />
          ))}
          <path d={`M${x(4) + W / 2} ${300 + H} V400`} stroke="#e8c547" strokeWidth={2} strokeDasharray="3 3" />
        </svg>

        {HEADERS.map((h) => (
          <div
            key={h.t}
            className={cn("absolute text-center text-sm font-black uppercase tracking-wider", h.gold ? "text-[#e8c547]" : "text-ash")}
            style={{ left: x(h.c), top: h.y, width: W }}
          >
            {t.rounds[h.t] ?? h.t}
          </div>
        ))}
        <div className="heading-slam absolute text-2xl text-[#e8c547]" style={{ left: 0, top: LB - 90 }}>
          <span className="text-rose-hi">{t.rounds.losers}</span> {t.rounds.bracket}
        </div>

        {Object.entries(POS).map(([id, [c, y]]) => {
          const m = matchById(id);
          if (!m) return null;
          const isGf = id.startsWith("GF");
          return (
            <div
              key={id}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "absolute overflow-hidden border bg-coal transition-colors",
                isGf ? "border-[#e8c547]/50" : "border-line",
                linked.has(id) && "border-rose/80 shadow-[0_0_0_1px_rgba(224,36,47,0.35)]",
              )}
              style={{ left: x(c), top: y, width: W, height: H }}
            >
              <div className="flex h-5 items-center justify-between bg-ink/70 px-2 text-[0.62rem] font-bold uppercase text-ash">
                <span>{id === "GF-M2" ? t.rounds.reset : ""}</span>
                <span className="num text-[0.7rem]">{m.datetime?.slice(0, 5).replace("/", ".") ?? ""}</span>
              </div>
              <Slot m={m} slot={1} />
              <Slot m={m} slot={2} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
