"use client";

import { useState } from "react";
import { allMatches, DROP_SOURCES, teamById, type Match } from "@/lib/data";
import { cn } from "@/lib/utils";

const W = 214;
const G = 52;
const H = 78;
const LB = 520;
const x = (c: number) => c * (W + G);

const POS: Record<string, [number, number]> = {
  "WB-R1-M1": [0, 0], "WB-R1-M2": [0, 100], "WB-R1-M3": [0, 200], "WB-R1-M4": [0, 300],
  "WB-R2-M1": [1, 50], "WB-R2-M2": [1, 250],
  "WB-R3-M1": [2, 150],
  "LB-R1-M1": [0, LB], "LB-R1-M2": [0, LB + 100],
  "LB-R2-M1": [1, LB], "LB-R2-M2": [1, LB + 100],
  "LB-R3-M1": [2, LB + 50],
  "LB-R4-M1": [3, LB + 50],
  "GF-M1": [4, 300], "GF-M2": [4, 400],
};

const WIN: Record<string, string> = {
  "WB-R1-M1": "WB-R2-M1", "WB-R1-M2": "WB-R2-M1", "WB-R1-M3": "WB-R2-M2", "WB-R1-M4": "WB-R2-M2",
  "WB-R2-M1": "WB-R3-M1", "WB-R2-M2": "WB-R3-M1", "WB-R3-M1": "GF-M1",
  "LB-R1-M1": "LB-R2-M1", "LB-R1-M2": "LB-R2-M2", "LB-R2-M1": "LB-R3-M1", "LB-R2-M2": "LB-R3-M1",
  "LB-R3-M1": "LB-R4-M1", "LB-R4-M1": "GF-M1",
};

const DROPS = Object.entries(DROP_SOURCES).map(([to, from]) => ({ from, to: to.split(".")[0] }));

const HEADERS = [
  { c: 0, y: -34, t: "Quarterfinals" },
  { c: 1, y: -34, t: "Semifinals" },
  { c: 2, y: -34, t: "Winners final" },
  { c: 4, y: 266, t: "Grand finals", gold: true },
  { c: 0, y: LB - 34, t: "Losers R1" },
  { c: 1, y: LB - 34, t: "Losers R2" },
  { c: 2, y: LB - 34, t: "Losers R3" },
  { c: 3, y: LB - 34, t: "Losers final" },
];

const byId = Object.fromEntries(allMatches.map((m) => [m.id, m]));

function Slot({ m, slot, dropFrom }: { m: Match; slot: 1 | 2; dropFrom?: string }) {
  const s = slot === 1 ? m.team1 : m.team2;
  const team = teamById(s.id);
  const won = m.winner === slot;
  const lost = m.winner !== null && !won;
  return (
    <div className={cn("flex h-[29px] items-center gap-2 px-2", won ? "bg-balkan/15" : "", lost && "opacity-50")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {team ? <img src={team.image} alt="" className="size-5 object-cover" /> : <span className="size-5 bg-slate" />}
      <span className={cn("min-w-0 flex-1 truncate text-[0.82rem]", team ? "font-bold" : "italic text-ash", won && "text-balkan")}>
        {team ? team.name : dropFrom ? `Loser of ${dropFrom}` : "TBD"}
      </span>
      <span className={cn("num w-5 text-right text-lg", won ? "text-balkan" : "text-paper/80")}>{s.score ?? ""}</span>
    </div>
  );
}

export function BracketView() {
  const [hover, setHover] = useState<string | null>(null);
  const linked = new Set<string>();
  if (hover) {
    for (const d of DROPS) if (d.from === hover || d.to === hover) linked.add(d.from).add(d.to);
  }
  const width = x(4) + W;
  const height = 620;

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
            {h.t}
          </div>
        ))}
        <div className="heading-slam absolute text-2xl text-[#e8c547]" style={{ left: 0, top: LB - 90 }}>
          <span className="text-rose-hi">Losers</span> bracket
        </div>

        {Object.entries(POS).map(([id, [c, y]]) => {
          const m = byId[id];
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
                m.winner && "border-l-[3px] border-l-balkan",
                linked.has(id) && "border-rose/80 shadow-[0_0_0_1px_rgba(224,36,47,0.35)]",
              )}
              style={{ left: x(c), top: y, width: W, height: H }}
            >
              <div className="flex h-5 items-center justify-between bg-ink/70 px-2 text-[0.62rem] font-bold uppercase text-ash">
                <span>{id === "GF-M2" ? "Bracket reset" : id}</span>
                <span className="num text-[0.7rem]">{m.datetime?.slice(0, 5).replace("/", ".") ?? ""}</span>
              </div>
              <Slot m={m} slot={1} dropFrom={DROP_SOURCES[`${id}.team1`]} />
              <Slot m={m} slot={2} dropFrom={DROP_SOURCES[`${id}.team2`]} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
