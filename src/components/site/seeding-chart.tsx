"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { qualifiers } from "@/lib/data";

export function SeedingChart() {
  const data = qualifiers.players.slice(0, 24).map((p, i) => ({ name: p.username, z: p.zSum, seed: i + 1 }));
  return (
    <div className="h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 60, left: -12 }}>
          <XAxis dataKey="name" angle={-55} textAnchor="end" interval={0} tick={{ fill: "#8a908b", fontSize: 11, fontWeight: 700 }} axisLine={{ stroke: "#2b302d" }} tickLine={false} />
          <YAxis tick={{ fill: "#8a908b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#0d0f0e", border: "1px solid #0fa06a", borderRadius: 0, fontWeight: 700 }}
            labelStyle={{ color: "#f4f3ee" }}
            formatter={(v) => [Number(v).toFixed(2), "Σ percentile"]}
          />
          <ReferenceLine x={data[11]?.name} stroke="#e0242f" strokeDasharray="4 4" label={{ value: "top 12", fill: "#e0242f", fontSize: 11, fontWeight: 800, position: "insideTopRight" }} />
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
