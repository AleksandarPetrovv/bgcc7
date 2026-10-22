"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Crown } from "lucide-react";
import type { Match } from "@/lib/data";
import { TWITCH_URL } from "@/lib/links";
import { useTournament } from "./tournament";
import { useDict, useLang } from "./lang";
import { MatchDialog } from "./match-dialog";
import { cn } from "@/lib/utils";
import { MeTag, meT } from "./me";
import { fitBox, useFit } from "./use-fit";
import { winTargets, type Format, type Half } from "@/lib/format";
import { TZ } from "@/lib/time";
import { HEX } from "@/lib/theme";

const TOP = 92;
type Pos = Record<string, [number, number, Half]>;

function bracketLayout(f: Format) {
  const { upRows, lowRows, gfRow, gfCol } = f.layout;
  const { g: G, h: H, gap, minW } = f.layout.box;
  const P = H + gap;
  const LOW = TOP + (upRows - 1) * P + H + 130;
  const CENTER = gfRow * P + H / 2;
  const POS: Pos = { "GF-M1": [gfCol, CENTER - H - 12, "u"], "GF-M2": [gfCol, CENTER + 12, "u"] };
  for (const [id, [c, r, h]] of Object.entries(f.layout.pos)) POS[id] = [c, r * P, h];
  const top = (id: string) => {
    const [, y, h] = POS[id];
    return (h === "u" ? TOP : LOW) + y;
  };
  return { G, H, P, minW, LOW, POS, top, WIN: winTargets(f), DROPS: f.layout.drops, HEADERS: f.layout.headers, gfCol, upRows, lowRows, mark: f.layout.mark };
}

const v = (o: Record<string, string | number>) => o as React.CSSProperties;

function Line({ m, slot, live, slim }: { m: Match; slot: 1 | 2; live?: [number, number] | null; slim?: boolean }) {
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
    <div {...meT(team.id)} className={cn("relative flex min-h-0 flex-1 items-center gap-1.5 pl-2 pr-2.5", won && "bg-[color-mix(in_oklab,var(--balkan)_14%,var(--white))]", leads && "bg-rose/10", lost && "opacity-45")}>
      {(won || leads) && <span className={cn("absolute inset-y-1 left-0 w-0.5", won ? "bg-balkan" : "bg-rose/60")} aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!slim && <img src={team.image} alt="" className="in-pop size-5 shrink-0 object-cover" style={v({ "--d": "0.45s" })} />}
      <span title={team.name} className={cn("in-wipe min-w-0 flex-1 truncate text-[0.8rem] font-display font-bold", won && "font-display font-black text-paper", leads && "font-display font-black text-rose-hi")} style={v({ "--d": "0.5s" })}>
        {team.name}
      </span>
      <MeTag t={team.id} className="-mx-1" />
      {score !== null && (
        <span className={cn("in-slam num ml-2 shrink-0 text-right text-xl leading-none", won ? "text-balkan-hi" : leads || tie ? "text-rose-hi" : "text-paper/80")} style={v({ "--d": "0.65s" })}>
          {score}
        </span>
      )}
    </div>
  );
}

function Box({ id, m, live, slim, className, style, onEnter, onLeave }: { id: string; m: Match; live?: [number, number] | null; slim?: boolean; className?: string; style?: React.CSSProperties; onEnter?: () => void; onLeave?: () => void }) {
  const t = useDict();
  const lang = useLang();
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const day = (dt: string) => new Date(dt).toLocaleDateString(locale, { timeZone: TZ, weekday: "short", day: "2-digit", month: "short" });
  const clock = (dt: string) => new Date(dt).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} className={cn("flex flex-col overflow-hidden border bg-coal transition-[border-color] duration-200", className)} style={style}>
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-line bg-ink/70 px-2.5">
        <span className="num truncate text-[0.78rem] text-paper/75">{m.datetime ? `${id === "GF-M2" ? new Date(m.datetime).toLocaleDateString(locale, { timeZone: TZ, day: "2-digit", month: "short" }) : day(m.datetime)} · ${clock(m.datetime)}` : m.winner ? "" : m.team1.id && m.team2.id ? t.common.tbd : "—"}</span>
        {id === "GF-M2" && <span className="shrink-0 whitespace-nowrap text-[0.6rem] font-display font-bold text-gold-hi">{t.rounds.reset}</span>}
        <span className="ml-auto flex items-center gap-1">
          {live !== undefined && <LiveDot />}
          {m.links.length > 0 && <MatchDialog match={m} compact />}
        </span>
      </div>
      <Line m={m} slot={1} live={live} slim={slim} />
      <div className="h-px shrink-0 bg-line" />
      <Line m={m} slot={2} live={live} slim={slim} />
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
  const { matches, format } = useTournament();
  const { G, H, P, minW, LOW, POS, top, WIN, DROPS, HEADERS, gfCol, upRows, lowRows, mark } = bracketLayout(format);
  const [hover, setHover] = useState<string | null>(null);
  const [end, setEnd] = useState(false);
  const anyLive = Object.keys(live).length > 0;
  useEffect(() => {
    if (!anyLive) return;
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [anyLive, router]);
  const { ref: box, avail: seen, scale: shrink } = useFit((gfCol + 1) * minW + gfCol * G, 768, 1);
  const avail = seen || 1500;

  const phone = seen > 0 && seen < 640;
  const gap = phone ? 44 : G;
  const W = phone ? Math.round(avail - gap) : Math.floor(Math.min(290, Math.max(minW, (avail - gfCol * G - 8) / (gfCol + 1))));
  const col = (c: number) => c * (W + gap);
  const byId = new Map(matches.map((m) => [m.id, m]));
  const inner = useRef<HTMLDivElement>(null);
  const lastCol = useRef(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    if (!phone) return;
    const c = Math.round(el.scrollLeft / (W + gap));
    if (c === lastCol.current) return;
    lastCol.current = c;
    const ids = Object.keys(POS).filter((id) => POS[id][0] === c);
    if (!ids.length || !inner.current) return;
    if (new Set(ids.map((id) => POS[id][2])).size > 1 && !ids.some((id) => id.startsWith("GF"))) return;
    const y0 = Math.min(...ids.map(top)) - 62;
    const y1 = Math.max(...ids.map(top)) + H;
    const base = inner.current.getBoundingClientRect().top + window.scrollY;
    const head = 72;
    const room = window.innerHeight - head;
    const y = y1 - y0 <= room ? base + (y0 + y1) / 2 - head - room / 2 : base + y0 - head - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };
  const locale = lang === "bg" ? "bg-BG" : "en-GB";

  const linked = new Set<string>();
  if (hover) for (const [a, b] of DROPS) if (a === hover || b === hover) linked.add(a).add(b);

  const width = col(gfCol) + W + (phone ? gap : 0);
  const height = LOW + (lowRows - 1) * P + H + 12;
  const scale = shrink < 1 ? shrink : seen >= 1280 && width < seen ? Math.min(1.35, seen / width) : 1;
  const fit = fitBox(width, height, scale);
  const lowCol = Math.min(...HEADERS.filter((h) => h.s === "l").map((h) => h.c));
  const midY = (id: string) => top(id) + H / 2;
  const firstTop = (c: number, s: Half) => Math.min(...Object.keys(POS).filter((id) => !id.startsWith("GF") && POS[id][0] === c && POS[id][2] === s).map(top));
  const wire = (a: string, b: string) => {
    const x1 = col(POS[a][0]) + W;
    const x2 = col(POS[b][0]);
    const mx = x2 - gap / 2;
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
    <div className="pointer-events-none absolute flex items-center gap-3" style={{ left: s === "u" ? 0 : col(lowCol), top: s === "u" ? 0 : LOW - 100 }}>
      <span className={cn("in-wipe heading-slam whitespace-nowrap text-xl sm:text-3xl", s === "l" && "text-rose-hi")} style={v({ "--d": s === "u" ? "0.1s" : "0.4s" })}>
        {s === "u" ? t.schedule.upper : t.schedule.lower}
      </span>
    </div>
  );

  const up = (w: string) => w.toLocaleUpperCase(locale);

  return (
    <div className="relative">
    <div ref={box} onScroll={onScroll} className="snap-x snap-mandatory overflow-x-auto overflow-y-hidden pb-4 md:snap-none">
      <div className="mx-auto mt-4" style={fit.outer}>
      <div ref={inner} className={cn("relative", scale === 1 && "mx-auto")} style={fit.inner}>
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
          <text x={col(mark)} y={TOP + (upRows - 1) * P + H - 6} className="in-trace heading-slam" fontSize={118} fill="none" stroke="color-mix(in srgb, var(--paper) 8%, transparent)" strokeWidth={1.5}>
            {up(t.schedule.upperWord)}
          </text>
          <text x={width} y={LOW + (lowRows - 1) * P + H - 4} textAnchor="end" className="in-trace heading-slam" fontSize={118} fill="none" stroke="color-mix(in srgb, var(--rose) 13%, transparent)" strokeWidth={1.5} style={v({ "--d": "0.4s" })}>
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
                stroke={done ? "var(--balkan-deep)" : HEX.line}
                strokeOpacity={1}
                strokeWidth={2}
              />
            );
          })}
          {DROPS.map(([a, b]) => (
            <path
              key={a + b}
              d={drop(a, b)}
              fill="none"
              stroke={HEX.rose}
              strokeWidth={2.25}
              strokeDasharray="6 5"
              className="transition-opacity duration-200"
              opacity={linked.has(a) && linked.has(b) ? 0.9 : 0}
            />
          ))}
          <path d={`M${col(gfCol) + W / 2} ${top("GF-M1") + H} V${top("GF-M2")}`} strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="3 4" className="in-up" style={v({ "--d": "1.3s", stroke: "var(--gold)" })} />
        </svg>

        {!phone && section("u")}
        {!phone && section("l")}

        {HEADERS.map((h) => {
          const y = phone ? firstTop(h.c, h.s) : h.s === "u" ? TOP : LOW;
          return (
            <div key={h.t}>
              {phone && (
                <div className="pointer-events-none absolute flex items-center gap-2" style={{ left: col(h.c), top: y - 74 }}>
                  <span className={cn("heading-slam whitespace-nowrap text-xl", h.s === "l" && "text-rose-hi")}>{h.s === "u" ? t.schedule.upper : t.schedule.lower}</span>
                </div>
              )}
              <div
                className="in-drop absolute snap-start truncate border-b border-line pb-1 text-xs font-display font-bold text-ash"
                style={{ left: col(h.c), top: y - 30, width: W, ...v({ "--i": h.c, "--s": "0.12s", "--d": h.s === "u" ? "0.15s" : "0.45s" }) }}
              >
                {t.rounds[h.t] ?? h.t}
              </div>
            </div>
          );
        })}
        <div
          className="in-drop absolute flex snap-start items-center gap-2 border-b border-gold/20 pb-1 text-xs font-display font-bold text-gold-hi/80"
          style={{ left: col(gfCol), top: top("GF-M1") - 30, width: W, ...v({ "--d": "0.7s" }) }}
        >
          <Crown className="size-3.5" /> {t.rounds["Grand Finals"]}
        </div>

        {Object.keys(POS).map((id) => {
          const m = byId.get(id);
          if (!m) return null;
          const [c] = POS[id];
          const gf = id.startsWith("GF");
          return (
            <Box
              key={id}
              id={id}
              m={m}
              live={id in live ? live[id] : undefined}
              slim={W < 200}
              onEnter={() => setHover(id)}
              onLeave={() => setHover(null)}
              className={cn("in-left-far absolute", gf ? "border-gold/70" : "border-line hover:border-paper/30", linked.has(id) && "border-rose/80")}
              style={{ left: col(c), top: top(id), width: W, height: H, ...v({ "--i": c, "--s": "0.14s", "--d": `${(POS[id][2] === "u" ? 0.2 : 0.5) + POS[id][1] / 2500}s` }) }}
            />
          );
        })}
      </div>
      </div>
    </div>
      {seen > 0 && width * scale > seen + 1 && (
        <div className={cn("pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-l from-ink to-transparent transition-opacity duration-300", end && "opacity-0")} aria-hidden>
          <ChevronRight className="anim-chevron size-5 text-paper/60" />
        </div>
      )}
    </div>
  );
}
