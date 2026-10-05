"use client";

import { Check, Crown, X } from "lucide-react";
import { G, H, HEADERS, LB, POS, W, WIN, x } from "./bracket-layout";
import { useDict } from "./lang";
import { flagUrl, fmtNum } from "@/lib/data";
import { ORDER, resolve, seedingOf, type Picks } from "@/lib/pickems";
import { useTournament } from "./tournament";

export type { Picks };
import { cn } from "@/lib/utils";
import { MeTag, meP, meT } from "./me";

export function PickemsBracket({ picks, onPick, locked = [] }: { picks: Picks; onPick?: (match: string, team: string) => void; locked?: string[] }) {
  const readOnly = !onPick;
  const t = useDict();
  const { teamById, matches } = useTournament();
  const { slots, picks: clean, resetLive, champion } = resolve(picks, seedingOf(matches));
  const champ = champion ? teamById(champion) : undefined;
  const real = (id: string) => {
    const m = matches.find((x) => x.id === id);
    return m?.winner ? (m.winner === 1 ? m.team1.id : m.team2.id) || null : null;
  };
  const wireColor = (id: string) => {
    if (!clean[id]) return { stroke: "#2b302d", opacity: 1 };
    const w = real(id);
    return w == null ? { stroke: "#f4f3ee", opacity: 0.3 } : w === clean[id] ? { stroke: "#0fa06a", opacity: 0.6 } : { stroke: "#e0242f", opacity: 0.55 };
  };
  const width = x(5) + W;
  const height = LB + 100 + H + 8;
  const wire = (a: string, b: string) => {
    const [ca, ya] = POS[a];
    const [cb, yb] = POS[b];
    const x1 = x(ca) + W, y1 = ya + H / 2, x2 = x(cb), y2 = yb + H / 2, mx = x2 - G / 2;
    return `M${x1} ${y1} H${mx} V${y2} H${x2}`;
  };

  return (
    <div className="overflow-x-auto overflow-y-hidden pb-4">
      <div className="relative mx-auto mt-10" style={{ width, height }}>
        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
          {Object.entries(WIN).map(([a, b]) => (
            <path key={a} d={wire(a, b)} pathLength={1} className="in-draw" style={{ "--d": `${0.55 + POS[a][0] * 0.14}s` } as React.CSSProperties} fill="none" stroke={wireColor(a).stroke} strokeOpacity={wireColor(a).opacity} strokeWidth={2} />
          ))}
          {resetLive && <path d={`M${x(5) + W / 2} ${POS["GF-M1"][1] + H} V${POS["GF-M2"][1]}`} stroke="#e8c547" strokeWidth={2} strokeDasharray="3 3" />}
        </svg>

        {HEADERS.map((h) => (
          <div
            key={h.t}
            className={cn("in-drop absolute truncate whitespace-nowrap text-center text-xs font-black uppercase tracking-[0.14em]", h.gold ? "text-[#e8c547]" : "text-ash")}
            style={{ left: x(h.c), top: h.y, width: W, "--i": h.c, "--s": "0.14s", "--d": "0.1s" } as React.CSSProperties}
          >
            {t.rounds[h.t] ?? h.t}
          </div>
        ))}
        <div className="in-wipe heading-slam absolute text-2xl text-[#e8c547]" style={{ left: x(1), top: LB - 90, "--d": "0.4s" } as React.CSSProperties}>
          <span className="text-rose-hi">{t.schedule.lower}</span>
        </div>

        {champ && (
          <div key={champ.id} className="anim-rise absolute border border-[#e8c547]/40 bg-coal" style={{ left: x(5), top: POS["GF-M2"][1] + H + 30, width: W }}>
            <div className="flex items-center gap-1.5 bg-[#e8c547] px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-ink">
              <Crown className="size-3.5" /> {t.pickems.champion}
            </div>
            <div className="flex items-center gap-3 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={champ.image} alt="" className="size-16 shrink-0 object-cover" />
              <div className="min-w-0 flex-1 break-words text-center text-lg font-black leading-tight">
                {champ.name}
                <MeTag t={champ.id} />
              </div>
            </div>
            <ul className="space-y-1.5 border-t border-line px-2.5 py-2.5">
              {champ.players.map((p) => (
                <li key={p.userId} {...meP(p.userId)} className="flex items-center gap-2 px-1 py-0.5 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.avatar} alt="" className="size-6 shrink-0" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flagUrl(p.country)} alt="" className="h-2.5 shrink-0" />
                  <span className="truncate font-bold">{p.username}</span>
                  <MeTag p={p.userId} />
                  {p.isCaptain && <Crown className="size-3.5 shrink-0 -translate-y-px text-[#e8c547]" aria-label={t.common.captain} />}
                  <span className="num ml-auto text-ash">#{fmtNum(p.rank)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ORDER.filter((id) => id !== "GF-M2" || resetLive).map((id) => {
          const [c, y] = POS[id];
          const pair = slots[id];
          const isGf = id.startsWith("GF");
          return (
            <div
              key={id}
              className={cn("in-left absolute flex flex-col divide-y divide-line border bg-coal", isGf ? "border-[#e8c547]/25" : "border-line")}
              style={{ left: x(c), top: y, width: W, height: H, "--i": c, "--s": "0.14s", "--d": `${0.15 + (y % 400) / 2500}s` } as React.CSSProperties}
            >
              {pair.map((tid, i) => {
                const team = tid ? teamById(tid) : undefined;
                const picked = !!tid && clean[id] === tid;
                const winner = real(id);
                const right = !!tid && winner === tid;
                const miss = picked && winner != null && !right;
                const lost = !!clean[id] && !picked && !right;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={readOnly || locked.includes(id) || !team || !pair[0] || !pair[1]}
                    onClick={() => team && onPick?.(id, team.id)}
                    {...meT(team?.id)}
                    className={cn(
                      "flex min-h-0 flex-1 items-center gap-2 px-2 text-left text-[0.82rem] transition-colors",
                      right ? "bg-balkan/20 font-black text-balkan" : miss ? "bg-rose/15 font-black text-rose-hi" : picked ? "bg-white/[0.06] font-black text-paper" : "font-bold enabled:hover:bg-slate",
                      lost && "text-ash",
                      !team && "cursor-default italic text-ash",
                    )}
                  >
                    {team && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={team.image} alt="" className={cn("size-5 object-cover", (lost || miss) && "opacity-50")} />
                        <span className="min-w-0 flex-1 truncate">{team.name}</span>
                        <MeTag t={team.id} className="-mx-1" />
                      </>
                    )}
                    {miss ? (
                      <span className="flex shrink-0 items-center gap-0.5 text-[0.65rem] font-black uppercase tracking-wide" aria-label={t.pickems.missed}>
                        <X className="size-3.5" strokeWidth={3} />
                      </span>
                    ) : (
                      (picked || right) && <Check className={cn("size-4 shrink-0", !right && "text-paper/70")} aria-label={right && !picked ? t.pickems.winner : t.pickems.yourPick} />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
