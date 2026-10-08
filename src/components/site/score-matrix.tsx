"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { fmtNum, flagUrl, type QualPerf, type QualMap, type QualPlayer } from "@/lib/data";
import { useDict } from "./lang";
import { osuUser } from "@/lib/links";
import { cn } from "@/lib/utils";
import { MeTag, meP } from "./me";
import { MEDAL_BG } from "@/lib/theme";

const MOD_COLOR: Record<string, string> = {
  NM: "text-mod-nm",
  HD: "text-mod-hd",
  HR: "text-mod-hr",
  DT: "text-mod-dt",
};


type Hover = { x: number; y: number; map: QualMap; perf: QualPerf; player: QualPlayer } | null;

export function ScoreMatrix({ qualifiers, cut }: { qualifiers: { maps: QualMap[]; players: QualPlayer[] }; cut: number }) {
  const t = useDict();
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<Hover>(null);

  const places = useMemo(() => {
    const out: Record<string, Record<number, number>> = {};
    for (const m of qualifiers.maps) {
      const ranked = qualifiers.players
        .filter((p) => p.perf[m.id])
        .sort((a, b) => b.perf[m.id].score - a.perf[m.id].score);
      out[m.id] = Object.fromEntries(ranked.map((p, i) => [p.id, i]));
    }
    return out;
  }, [qualifiers]);

  const rows = qualifiers.players.filter((p) => p.username.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative">
      <div className="mb-4 flex items-center gap-2 border border-line bg-coal px-3 focus-within:border-balkan sm:w-80">
        <Search className="size-4 shrink-0 text-ash" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.qual.searchPlayer}
          aria-label={t.qual.searchPlayer}
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ash"
        />
      </div>

      <div className="overflow-x-auto border border-line" onMouseLeave={() => setHover(null)}>
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate text-left text-[0.7rem] font-black uppercase tracking-wide text-ash">
              <th className="sticky left-0 z-10 bg-slate px-3 py-3">{t.qual.cols[0]}</th>
              <th className="sticky left-14 z-10 bg-slate px-3 py-3">{t.qual.cols[1]}</th>
              <th className="px-3 py-3 text-right">{t.qual.cols[2]}</th>
              <th className="px-3 py-3 text-right">{t.qual.cols[3]}</th>
              {qualifiers.maps.map((m) => (
                <th key={m.id} className={cn("px-2 py-3 text-right", MOD_COLOR[m.slot.slice(0, 2)])}>
                  {m.slot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const seed = qualifiers.players.indexOf(p) + 1;
              return (
                <tr key={p.id} className={cn("in-left border-t border-line", seed <= cut ? "" : "opacity-60")} style={{ "--i": Math.min(i, 24), "--s": "0.03s", "--d": "0.2s" } as React.CSSProperties}>
                  <td className="sticky left-0 z-10 bg-ink px-3 py-2">
                    <span className={cn("num inline-block min-w-9 px-1.5 text-center text-base", seed <= 3 ? `${MEDAL_BG[seed - 1]} text-ink` : "bg-slate text-paper")}>#{seed}</span>
                  </td>
                  <td {...meP(p.id)} className="me-hl sticky left-14 z-10 bg-ink px-3 py-2">
                    <span className="flex items-center gap-2 whitespace-nowrap font-bold">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.avatar} alt="" className="size-7" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.cc && <img src={flagUrl(p.cc)} alt="" className="h-2.5" />}
                      <a href={osuUser(p.id)} target="_blank" rel="noreferrer" className="hover:text-rose-hi">{p.username}</a>
                      <MeTag p={p.id} />
                    </span>
                  </td>
                  <td className="num px-3 py-2 text-right text-xl text-balkan">{p.zSum.toFixed(2)}</td>
                  <td className="num px-3 py-2 text-right text-base text-paper/70">{p.avgAcc.toFixed(2)}%</td>
                  {qualifiers.maps.map((m) => {
                    const perf = p.perf[m.id];
                    const place = places[m.id][p.id];
                    return (
                      <td
                        key={m.id}
                        className={cn("num cursor-default px-2 py-2 text-right text-base transition-colors hover:bg-slate", !perf && "text-line")}
                        onMouseEnter={(e) => {
                          if (!perf) return setHover(null);
                          const r = e.currentTarget.getBoundingClientRect();
                          setHover({ x: r.right, y: r.top, map: m, perf, player: p });
                        }}
                      >
                        {perf ? (
                          <span className={cn(place === 0 && "text-gold", place === 1 && "text-silver", place === 2 && "text-bronze", perf.manual && "underline decoration-gold decoration-dotted underline-offset-4")}>
                            {fmtNum(perf.score)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hover && <ScoreCard {...hover} />}
    </div>
  );
}

function ScoreCard({ x, y, map, perf, player }: NonNullable<Hover>) {
  const t = useDict();
  const W = 300;
  const H = 230;
  const left = Math.min(x + 8, window.innerWidth - W - 12);
  const top = Math.max(84, y - H - 8);
  return (
    <div className="pointer-events-none fixed z-50 w-[300px] border border-balkan bg-ink shadow-2xl shadow-black/60" style={{ left, top }}>
      <div className="relative h-16 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={map.cover} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
        <div className="relative flex h-full flex-col justify-end bg-gradient-to-t from-ink to-transparent px-3 pb-1.5">
          <span className="text-[0.65rem] font-black uppercase text-rose-hi">
            {map.slot} · {player.username}
          </span>
          <span className="truncate text-sm font-black">{map.title}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-line text-sm">
        {[
          [t.qual.detail[0], fmtNum(perf.score), "text-balkan"],
          [t.qual.detail[1], `${perf.acc.toFixed(2)}%`, "text-paper"],
          [t.qual.detail[2], `${(perf.percentile * 100).toFixed(1)}%`, "text-paper"],
          [t.qual.detail[3], `#${perf.placement}`, "text-rose-hi"],
          [t.qual.detail[4], perf.mods, "text-paper"],
          [t.qual.detail[5], perf.rank, "text-paper"],
        ].map(([k, v, c]) => (
          <div key={k} className="flex items-center justify-between gap-2 bg-coal px-3 py-2">
            <span className="text-[0.65rem] font-black uppercase text-ash">{k}</span>
            <span className={cn("num whitespace-nowrap text-base", c)}>{v}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 text-[0.65rem] font-bold uppercase text-ash">{perf.manual ? <span className="text-gold">{t.qual.manual}</span> : perf.matchName}</div>
    </div>
  );
}
