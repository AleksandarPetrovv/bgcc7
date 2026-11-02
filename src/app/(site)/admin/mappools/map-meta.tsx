import { Star } from "lucide-react";
import { fmtLen } from "@/lib/data";
import { osuMap } from "@/lib/links";
import { MODS } from "@/lib/mods";
import { modHi } from "@/lib/theme";
import { SlantBg } from "@/components/site/slant";

export function ModChip({ mod }: { mod: string }) {
  const c = modHi(MODS[mod].color);
  return (
    <span className="relative isolate px-1.5 py-0.5 text-[0.65rem] font-display font-black" style={{ color: c }}>
      <SlantBg className="border" style={{ borderColor: c }} />
      {MODS[mod].short}
    </span>
  );
}

type MapInfo = { title: string; version: string; sr: number; bpm: number; length: number; cs?: number | null; ar?: number | null; od?: number | null };

/** title link and stat line of a pool map row; `note` sits between them, `children` after the id */
export function MapMeta({ id, map: m, diff, note, children }: { id: number; map: MapInfo; diff?: boolean; note?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <>
      <a href={osuMap(id)} target="_blank" rel="noreferrer" className="block truncate font-display font-bold decoration-rose underline-offset-4 transition-colors hover:text-rose-hi hover:underline">
        {m.title} <span className="text-ash">[{m.version}]</span>
      </a>
      {note}
      <div className="num flex flex-wrap gap-x-3 text-sm text-paper/70">
        <span className="flex items-center gap-1 text-gold-hi">
          <Star className="size-3.5 fill-current" /> {m.sr.toFixed(2)}
        </span>
        <span>{Math.round(m.bpm)} bpm</span>
        <span>{fmtLen(m.length)}</span>
        {diff && (
          <span className="hidden text-ash sm:inline">
            CS {m.cs} · AR {m.ar} · OD {m.od}
          </span>
        )}
        <span className="text-ash">ID: {id}</span>
        {children}
      </div>
    </>
  );
}
