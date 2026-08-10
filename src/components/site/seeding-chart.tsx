"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QualPlayer } from "@/lib/data";
import { useDict } from "./lang";

export function SeedingChart({ players, cut }: { players: QualPlayer[]; cut: number }) {
  const t = useDict();
  const data = players.slice(0, cut).map((p, i) => ({ name: p.username, z: p.zSum, seed: i + 1 }));
  return (
    <div className="h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 60, left: -12 }}>
          <XAxis dataKey="name" angle={-55} textAnchor="end" interval={0} tick={{ fill: "#8a908b", fontSize: 11, fontWeight: 700 }} axisLine={{ stroke: "#2b302d" }} tickLine={false} />
          <YAxis tick={{ fill: "#8a908b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#161917", border: "1px solid #2b302d", borderRadius: 0, fontWeight: 700, color: "#f4f3ee" }}
            labelStyle={{ color: "#f4f3ee", marginBottom: 2 }}
            itemStyle={{ color: "#f4f3ee" }}
            formatter={(v) => [Number(v).toFixed(2), t.qual.percentile]}
          />
          <ReferenceLine x={data[11]?.name} stroke="#e0242f" strokeDasharray="4 4" label={{ value: t.qual.top12, fill: "#e0242f", fontSize: 11, fontWeight: 800, position: "insideTopRight" }} />
          <Bar dataKey="z" radius={0}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.seed <= 3 ? "#e0242f" : d.seed <= 12 ? "#0fa06a" : "#2b302d"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
