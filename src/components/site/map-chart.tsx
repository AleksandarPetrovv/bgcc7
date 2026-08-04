"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { qualifiers } from "@/lib/data";

const COLOR: Record<string, string> = { NM: "#3b82f6", HD: "#f5b820", HR: "#e0242f", DT: "#a78bfa" };

export function MapDifficultyChart() {
  const data = qualifiers.maps.map((m) => {
    const scores = qualifiers.players.map((p) => p.perf[m.id]?.score).filter(Boolean) as number[];
    return { slot: m.slot, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), title: m.title };
  });
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="slot" tick={{ fill: "#f4f3ee", fontSize: 13, fontWeight: 800 }} axisLine={{ stroke: "#2b302d" }} tickLine={false} />
          <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: "#8a908b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#0d0f0e", border: "1px solid #0fa06a", borderRadius: 0, fontWeight: 700 }}
            labelStyle={{ color: "#f4f3ee" }}
            formatter={(v) => [Number(v).toLocaleString("en-US"), "avg score"]}
          />
          <Bar dataKey="avg" radius={0}>
            {data.map((d) => (
              <Cell key={d.slot} fill={COLOR[d.slot.slice(0, 2)]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
