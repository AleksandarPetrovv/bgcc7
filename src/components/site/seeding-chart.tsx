"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QualPlayer } from "@/lib/data";
import { useDict } from "./lang";
import { HEX } from "@/lib/theme";

export function SeedingChart({ players, cut }: { players: QualPlayer[]; cut: number }) {
  const t = useDict();
  const data = players.slice(0, cut).map((p, i) => ({ name: p.username, z: p.zSum, seed: i + 1 }));
  return (
    <div className="h-[320px] sm:h-[420px] 2xl:h-[540px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 60, left: -12 }}>
          <XAxis dataKey="name" angle={-55} textAnchor="end" interval={0} tick={{ fill: HEX.ash, fontSize: 10, fontWeight: 700 }} axisLine={{ stroke: HEX.line }} tickLine={false} />
          <YAxis tick={{ fill: HEX.ash, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: HEX.coal, border: `1px solid ${HEX.line}`, borderRadius: 0, fontWeight: 700, color: HEX.paper }}
            labelStyle={{ color: HEX.paper, marginBottom: 2 }}
            itemStyle={{ color: HEX.paper }}
            formatter={(v) => [Number(v).toFixed(2), t.qual.percentile]}
          />
          <ReferenceLine x={data[11]?.name} stroke={HEX.rose} strokeDasharray="4 4" label={{ value: t.qual.top12, fill: HEX.rose, fontSize: 11, fontWeight: 800, position: "insideTopRight" }} />
          <Bar dataKey="z" radius={0}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.seed <= 3 ? HEX.rose : d.seed <= 12 ? HEX.balkan : HEX.line} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
