"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import type { Match } from "@/lib/data";
import { TWITCH_URL } from "@/lib/links";
import { useTournament } from "./tournament";
import { useDict, useLang } from "./lang";
import { MatchDialog } from "./match-dialog";
import { TriTick } from "./graphics";
import { cn } from "@/lib/utils";

const G = 40;
const H = 92;
const P = H + 18;
const TOP = 72;
const LOW = TOP + 3 * P + H + 110;
const CENTER = 1.5 * P + H / 2;

const POS: Record<string, [number, number, "u" | "l"]> = {
  "WB-R1-M1": [0, 0, "u"], "WB-R1-M2": [0, P, "u"], "WB-R1-M3": [0, 2 * P, "u"], "WB-R1-M4": [0, 3 * P, "u"],
  "WB-R2-M1": [1, 0.5 * P, "u"], "WB-R2-M2": [1, 2.5 * P, "u"],
  "WB-R3-M1": [2, 1.5 * P, "u"],
  "GF-M1": [5, CENTER - H - 12, "u"], "GF-M2": [5, CENTER + 12, "u"],
  "LB-R1-M1": [1, 0, "l"], "LB-R1-M2": [1, P, "l"],
  "LB-R2-M1": [2, 0, "l"], "LB-R2-M2": [2, P, "l"],
  "LB-R3-M1": [3, 0.5 * P, "l"],
  "LB-R4-M1": [4, 0.5 * P, "l"],
};

const top = (id: string) => {
  const [, y, s] = POS[id];
  return (s === "u" ? TOP : LOW) + y;
};

const WIN: Record<string, string> = {
  "WB-R1-M1": "WB-R2-M1", "WB-R1-M2": "WB-R2-M1", "WB-R1-M3": "WB-R2-M2", "WB-R1-M4": "WB-R2-M2",
  "WB-R2-M1": "WB-R3-M1", "WB-R2-M2": "WB-R3-M1", "WB-R3-M1": "GF-M1",
  "LB-R1-M1": "LB-R2-M1", "LB-R1-M2": "LB-R2-M2", "LB-R2-M1": "LB-R3-M1", "LB-R2-M2": "LB-R3-M1",
  "LB-R3-M1": "LB-R4-M1", "LB-R4-M1": "GF-M1",
};

const DROPS = [
  ["WB-R1-M1", "LB-R1-M1"], ["WB-R1-M4", "LB-R1-M1"], ["WB-R1-M2", "LB-R1-M2"], ["WB-R1-M3", "LB-R1-M2"],
  ["WB-R2-M2", "LB-R2-M1"], ["WB-R2-M1", "LB-R2-M2"], ["WB-R3-M1", "LB-R4-M1"],
];

const HEADERS: { c: number; s: "u" | "l"; t: string }[] = [
  { c: 0, s: "u", t: "Round 1 (Quarter-Finals)" },
  { c: 1, s: "u", t: "Round 2 (Semi-Finals)" },
  { c: 2, s: "u", t: "Winners Finals" },
  { c: 1, s: "l", t: "Losers Round 1" },
  { c: 2, s: "l", t: "Losers Round 2" },
  { c: 3, s: "l", t: "Losers Round 3" },
  { c: 4, s: "l", t: "Losers Finals" },
];

const v = (o: Record<string, string | number>) => o as React.CSSProperties;

function Line({ m, slot, live }: { m: Match; slot: 1 | 2; live?: [number, number] | null }) {
  const { teamById } = useTournament();
  const side = slot === 1 ? m.team1 : m.team2;
  const team = teamById(side.id);
  if (!team) return <div className="min-h-0 flex-1" />;
  const won = !live && m.winner === slot;
  const lost = !live && m.winner !== null && !won;
  const tie = !!live && live[0] === live[1];
  const leads = !!live && !tie && live[slot - 1] > live[2 - slot];
  const score = live ? live[slot - 1] : m.winner !== null ? (side.score ?? 0) : null;
  return (
    <div className={cn("relative flex min-h-0 flex-1 items-center gap-2.5 px-2.5", won && "bg-balkan/12", leads && "bg-rose/10", lost && "opacity-45")}>
      {(won || leads) && <span className={cn("absolute inset-y-1 left-0 w-0.5", won ? "bg-balkan" : "bg-rose/60")} aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={team.image} alt="" className="in-pop size-7 shrink-0 object-cover" style={v({ "--d": "0.45s" })} />
      <span className={cn("in-wipe min-w-0 flex-1 truncate text-sm font-bold", won && "font-black text-balkan", leads && "font-black text-[#e8868b]")} style={v({ "--d": "0.5s" })}>
        {team.name}
      </span>
      {score !== null && (
        <span className={cn("in-slam num w-6 text-right text-xl leading-none", won ? "text-balkan" : leads || tie ? "text-[#e8868b]" : "text-paper/80")} style={v({ "--d": "0.65s" })}>
          {score}
        </span>
      )}
    </div>
  );
}

function LiveDot() {
  const t = useDict();
  return (
    <a href={TWITCH_URL} target="_blank" rel="noreferrer" title={t.home.live} aria-label={t.home.live} className="relative flex size-6 items-center justify-center">
      <span className="absolute size-2.5 animate-ping rounded-full bg-rose/60" aria-hidden />
      <span className="relative size-2 animate-pulse rounded-full bg-rose" aria-hidden />
    </a>
  );
}

export function MatchBracket({ live = {} }: { live?: Record<string, [number, number] | null> }) {
  const t = useDict();
  const lang = useLang();
  const router = useRouter();
  const { matches } = useTournament();
  const [hover, setHover] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(1500);
  const anyLive = Object.keys(live).length > 0;
  useEffect(() => {
    if (!anyLive) return;
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [anyLive, router]);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAvail(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = Math.round(Math.min(280, Math.max(210, (avail - 5 * G) / 6)));
  const col = (c: number) => c * (W + G);
  const byId = new Map(matches.map((m) => [m.id, m]));
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const day = (dt: string) => new Date(dt).toLocaleDateString(locale, { timeZone: "Europe/Sofia", weekday: "short", day: "2-digit", month: "short" });
  const clock = (dt: string) => new Date(dt).toLocaleTimeString("en-GB", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  const linked = new Set<string>();
  if (hover) for (const [a, b] of DROPS) if (a === hover || b === hover) linked.add(a).add(b);

  const width = col(5) + W;
  const height = LOW + P + H + 12;
  const midY = (id: string) => top(id) + H / 2;
  const wire = (a: string, b: string) => {
    const x1 = col(POS[a][0]) + W;
    const x2 = col(POS[b][0]);
    const mx = x2 - G / 2;
    return `M${x1} ${midY(a)} H${mx} V${midY(b)} H${x2}`;
  };
  const drop = (a: string, b: string) => {
    const x1 = col(POS[a][0]) + W / 2;
    const x2 = col(POS[b][0]) + W / 2;
    const y1 = top(a) + H;
    const y2 = top(b);
    return `M${x1} ${y1} C${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
  };

  const section = (s: "u" | "l") => (
    <div className="pointer-events-none absolute flex items-center gap-3" style={{ left: s === "u" ? 0 : col(1), top: s === "u" ? 0 : LOW - 72 }}>
      <span className="in-left-far inline-flex" style={v({ "--d": s === "u" ? "0.05s" : "0.35s" })}>
        <TriTick />
      </span>
      <span className={cn("in-wipe heading-slam text-3xl", s === "l" && "text-rose-hi")} style={v({ "--d": s === "u" ? "0.1s" : "0.4s" })}>
        {s === "u" ? t.schedule.upper : t.schedule.lower}
      </span>
    </div>
  );

  const up = (w: string) => w.toLocaleUpperCase(locale);

  return (
    <div ref={box} className="overflow-x-auto overflow-y-hidden pb-4">
      <div className="relative mx-auto mt-4" style={{ width, height }}>
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
          <text x={col(3)} y={TOP + 3 * P + H - 6} className="in-trace heading-slam" fontSize={118} fill="none" stroke="rgba(244,243,238,0.08)" strokeWidth={1.5}>
            {up(t.schedule.upperWord)}
          </text>
          <text x={width} y={LOW + P + H - 4} textAnchor="end" className="in-trace heading-slam" fontSize={118} fill="none" stroke="rgba(224,36,47,0.13)" strokeWidth={1.5} style={v({ "--d": "0.4s" })}>
            {up(t.schedule.lowerWord)}
          </text>
          {Object.entries(WIN).map(([a, b]) => {
            const done = !!byId.get(a)?.winner;
            return (
              <path
                key={a}
                d={wire(a, b)}
                pathLength={1}
                className="in-draw"
                style={v({ "--d": `${0.6 + POS[a][0] * 0.14}s` })}
                fill="none"
                stroke={done ? "#0fa06a" : "#2b302d"}
                strokeOpacity={done ? 0.7 : 1}
                strokeWidth={2}
              />
            );
          })}
          {DROPS.map(([a, b]) => (
            <path
              key={a + b}
              d={drop(a, b)}
              fill="none"
              stroke="#e0242f"
              strokeWidth={2.25}
              strokeDasharray="6 5"
              className="transition-opacity duration-200"
              opacity={linked.has(a) && linked.has(b) ? 0.9 : 0}
            />
          ))}
          <path d={`M${col(5) + W / 2} ${top("GF-M1") + H} V${top("GF-M2")}`} stroke="#e8c547" strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="3 4" className="in-up" style={v({ "--d": "1.3s" })} />
        </svg>

        {section("u")}
        {section("l")}

        {HEADERS.map((h) => (
          <div
            key={h.t}
            className="in-drop absolute border-b border-line pb-1 text-xs font-black uppercase tracking-widest text-ash"
            style={{ left: col(h.c), top: (h.s === "u" ? TOP : LOW) - 30, width: W, ...v({ "--i": h.c, "--s": "0.12s", "--d": h.s === "u" ? "0.15s" : "0.45s" }) }}
          >
            {t.rounds[h.t] ?? h.t}
          </div>
        ))}
        <div
          className="in-drop absolute flex items-center gap-2 border-b border-[#e8c547]/20 pb-1 text-xs font-black uppercase tracking-widest text-[#e8c547]/80"
          style={{ left: col(5), top: top("GF-M1") - 30, width: W, ...v({ "--d": "0.7s" }) }}
        >
          <Crown className="size-3.5" /> {t.rounds["Grand Finals"]}
        </div>

        {Object.keys(POS).map((id) => {
          const m = byId.get(id);
          if (!m) return null;
          const [c] = POS[id];
          const gf = id.startsWith("GF");
          const l = id in live ? live[id] : undefined;
          const isLive = l !== undefined;
          return (
            <div
              key={id}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "in-left-far absolute flex flex-col overflow-hidden border bg-coal transition-[border-color] duration-200",
                gf ? "border-[#e8c547]/25" : "border-line hover:border-paper/30",
                linked.has(id) && "border-rose/80",
              )}
              style={{ left: col(c), top: top(id), width: W, height: H, ...v({ "--i": c, "--s": "0.14s", "--d": `${(POS[id][2] === "u" ? 0.2 : 0.5) + POS[id][1] / 2500}s` }) }}
            >
              <div className="flex h-7 shrink-0 items-center gap-2 border-b border-line bg-ink/70 px-2.5">
                <span className="num truncate text-[0.78rem] text-paper/75">{m.datetime ? `${day(m.datetime)} · ${clock(m.datetime)}` : t.common.tbd}</span>
                {id === "GF-M2" && <span className="text-[0.6rem] font-black uppercase text-[#e8c547]">{t.rounds.reset}</span>}
                <span className="ml-auto flex items-center gap-1">
                  {isLive && <LiveDot />}
                  {m.links.length > 0 && <MatchDialog match={m} compact />}
                </span>
              </div>
              <Line m={m} slot={1} live={l} />
              <div className="h-px shrink-0 bg-line" />
              <Line m={m} slot={2} live={l} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
