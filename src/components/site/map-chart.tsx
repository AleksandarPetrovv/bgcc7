"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QualMap, QualPlayer } from "@/lib/data";
import { useDict } from "./lang";
import { HEX } from "@/lib/theme";
import { slotColor } from "@/lib/format-plan";

export function MapDifficultyChart({ qualifiers }: { qualifiers: { maps: QualMap[]; players: QualPlayer[] } }) {
  const t = useDict();
  const data = qualifiers.maps
    .map((m) => {
      const scores = qualifiers.players.map((p) => p.perf[m.id]?.score).filter(Boolean) as number[];
      return { slot: m.slot, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0, title: m.title };
    })
    .filter((d) => d.avg > 0);
  const top = Math.ceil(Math.max(1, ...data.map((d) => d.avg)) / 100_000) * 100_000;
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="25%" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="bar-sheen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity={0.16} />
              <stop offset="0.45" stopColor="white" stopOpacity={0.03} />
              <stop offset="1" stopColor="black" stopOpacity={0.12} />
            </linearGradient>
          </defs>
          <XAxis dataKey="slot" interval={0} tick={{ fill: HEX.paper, fontSize: data.length > 12 ? 10 : 13, fontWeight: 800 }} axisLine={{ stroke: HEX.line }} tickLine={false} />
          <YAxis domain={[0, top]} tickCount={top / 100_000 + 1} tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: HEX.ash, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--rose) 10%, transparent)" }}
            contentStyle={{ background: HEX.coal, border: `1px solid ${HEX.line}`, borderRadius: 0, fontWeight: 700, color: HEX.paper }}
            labelStyle={{ color: HEX.paper, marginBottom: 2 }}
            itemStyle={{ color: HEX.paper }}
            formatter={(v) => [Number(v).toLocaleString("en-US"), t.stats.avgScore]}
          />
          <Bar
            dataKey="avg"
            radius={0}
            isAnimationActive={false}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; index?: number }) => {
              const { x = 0, y = 0, width: w = 0, height: h = 0 } = props;
              const r = Math.min(6, w / 2, h);
              const d = `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
              return (
                <g className="in-grow-y transition-[filter] duration-200 hover:brightness-108" style={{ "--i": props.index ?? 0, "--s": "0.07s", "--d": "0.15s" } as React.CSSProperties}>
                  <path d={d} fill={props.fill} />
                  <path d={d} fill="url(#bar-sheen)" />
                </g>
              );
            }}
          >
            {data.map((d) => (
              <Cell key={d.slot} fill={slotColor(d.slot)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
