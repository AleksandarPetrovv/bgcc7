import { HEX } from "@/lib/theme";

export const tooltipStyle = {
  cursor: { fill: "color-mix(in srgb, var(--rose) 10%, transparent)" },
  contentStyle: { background: HEX.coal, border: `1px solid ${HEX.line}`, borderRadius: 0, fontWeight: 700, color: HEX.paper },
  labelStyle: { color: HEX.paper, marginBottom: 2 },
  itemStyle: { color: HEX.paper },
};

export const xAxisLine = { axisLine: { stroke: HEX.line }, tickLine: false } as const;
export const yAxisStyle = { tick: { fill: HEX.ash, fontSize: "0.6875rem" }, axisLine: false, tickLine: false } as const;
