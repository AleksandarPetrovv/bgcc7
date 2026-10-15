import { fmtNum, type QualMap, type QualPlayer } from "@/lib/data";
import type { Dict } from "@/lib/i18n/dict";
import { Tag } from "@/components/site/page";
import { cn } from "@/lib/utils";
import { Card, label } from "./cards";

export function QualifierScores({ t, maps, player }: { t: Dict; maps: QualMap[]; player: QualPlayer }) {
  return (
    <Card title={t.me.yourScores} i={3} className="lg:col-span-2" flush>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className={cn("border-y border-line text-left", label)}>
              <th className="px-5 py-2">{t.me.map}</th>
              <th className="py-2 pr-4 text-right">{t.me.score}</th>
              <th className="py-2 pr-4 text-right">{t.me.acc}</th>
              <th className="py-2 pr-5 text-right">{t.me.mapRank}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {maps.map((m) => {
              const p = player.perf[m.id];
              return (
                <tr key={m.id}>
                  <td className="px-5 py-2.5">
                    <span className="heading-slam mr-3 text-base">{m.slot}</span>
                    <span className="text-paper/70">{m.title}</span>
                  </td>
                  <td className="num py-2.5 pr-4 text-right text-base">{p ? fmtNum(p.score) : "—"}</td>
                  <td className="num py-2.5 pr-4 text-right text-ash">{p ? `${p.acc.toFixed(2)}%` : "—"}</td>
                  <td className={cn("num py-2.5 pr-5 text-right", p?.placement === 1 && "text-gold")}>{p ? `#${p.placement}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function QualifierPlacement({ t, placement, total, cut }: { t: Dict; placement: number; total: number; cut: number }) {
  return (
    <Card title={t.me.placement} i={1}>
      <div className="flex items-end gap-3">
        <span className="num text-6xl leading-[0.8] sm:text-7xl">#{placement + 1}</span>
        <span className="pb-1 text-sm text-ash">{t.me.ofN(total)}</span>
        <Tag tone={placement < cut ? "balkan" : "rose"} className="mb-1 ml-auto text-xs">
          {placement < cut ? t.me.qualified : t.me.notQualified}
        </Tag>
      </div>
      <div className="mt-4 h-1.5 bg-ink">
        <div className={cn("h-full", placement < cut ? "bg-balkan" : "bg-rose/70")} style={{ width: `${Math.max(4, 100 - (placement / Math.max(1, total - 1)) * 100)}%` }} />
      </div>
    </Card>
  );
}
