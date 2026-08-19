"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QualMap, QualPlayer } from "@/lib/data";
import { useDict } from "./lang";

const COLOR: Record<string, string> = { NM: "#3b82f6", HD: "#f5b820", HR: "#e0242f", DT: "#a78bfa" };

export function MapDifficultyChart({ qualifiers }: { qualifiers: { maps: QualMap[]; players: QualPlayer[] } }) {
  const t = useDict();
  const data = qualifiers.maps.map((m) => {
    const scores = qualifiers.players.map((p) => p.perf[m.id]?.score).filter(Boolean) as number[];
    return { slot: m.slot, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0, title: m.title };
  });
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="slot" tick={{ fill: "#f4f3ee", fontSize: 13, fontWeight: 800 }} axisLine={{ stroke: "#2b302d" }} tickLine={false} />
          <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fill: "#8a908b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#161917", border: "1px solid #2b302d", borderRadius: 0, fontWeight: 700, color: "#f4f3ee" }}
            labelStyle={{ color: "#f4f3ee", marginBottom: 2 }}
            itemStyle={{ color: "#f4f3ee" }}
            formatter={(v) => [Number(v).toLocaleString("en-US"), t.stats.avgScore]}
          />
          <Bar
            dataKey="avg"
            radius={0}
            isAnimationActive={false}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; index?: number }) => (
              <rect
                x={props.x}
                y={props.y}
                width={props.width}
                height={props.height}
                fill={props.fill}
                className="in-grow-y"
                style={{ "--i": props.index ?? 0, "--s": "0.07s", "--d": "0.15s" } as React.CSSProperties}
              />
            )}
          >
            {data.map((d) => (
              <Cell key={d.slot} fill={COLOR[d.slot.slice(0, 2)]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
