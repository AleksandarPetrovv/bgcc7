"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Crown } from "lucide-react";
import type { Match } from "@/lib/data";
import { TWITCH_URL } from "@/lib/links";
import { useFormat, useTournament } from "./tournament";
import { useDict, useLang } from "./lang";
import { MatchDialog } from "./match-dialog";
import { cn, cssVars } from "@/lib/utils";
import { MeTag, meT } from "./me";
import { fitBox, useFit } from "./use-fit";
import { useBracketOptions, useResultsEye } from "./overlay-context";
import { availOr, colWidth, gfRound, isPhone, shrinkScale, upscale, wirePath } from "@/lib/bracket-geometry";
import { GF, GF_RESET, isGfId, matchNum, winTargets, type Format, type Half } from "@/lib/format";
import { fmtDate, fmtSofiaTime } from "@/lib/time";
import { roundName } from "@/lib/i18n/dict";
import { beforeResult, hasResults, resultMoves, type ResultMove } from "@/lib/matches";
import { HEX } from "@/lib/theme";
import { localeOf } from "@/lib/i18n/locale";

const TOP = 92;
// reveal, per match: a pause, a zoom onto the boxes that change, the score, a short settle, then the winner moves, then the loser
const PAUSE_MS = 3000;
const ZOOM_S = 1.4;
const SETTLE_MS = 1000;
const FLY_S = 0.9;
const AFTER_MS = 600;
const HOLD_MS = 1600;
const ZOOM_MAX = 2.2;
const ZOOM_PAD = 70;
const EASE_IO = [0.65, 0, 0.35, 1] as const;
// the box's header strip (h-7), to place a team's line inside it
const HEAD = 28;

type Play = { id: string; scored: boolean; loser: boolean; zoom: boolean; landed: string[]; flying: ResultMove[] };
type Pos = Record<string, [number, number, Half]>;

function bracketLayout(f: Format) {
  const { upRows, lowRows, gfRow, gfCol } = f.layout;
  const { g: G, h: H, gap, minW } = f.layout.box;
  const P = H + gap;
  const LOW = TOP + (upRows - 1) * P + H + 130;
  const CENTER = gfRow * P + H / 2;
  const POS: Pos = { [GF]: [gfCol, CENTER - H - 12, "u"], [GF_RESET]: [gfCol, CENTER + 12, "u"] };
  for (const [id, [c, r, h]] of Object.entries(f.layout.pos)) POS[id] = [c, r * P, h];
  const top = (id: string) => {
    const [, y, h] = POS[id];
    return (h === "u" ? TOP : LOW) + y;
  };
  return { G, H, P, minW, LOW, POS, top, WIN: winTargets(f), DROPS: f.layout.drops, HEADERS: f.layout.headers, gfCol, upRows, lowRows, mark: f.layout.mark };
}


// moved: a reveal flight landed here, so no intro, and it keeps the gold it turned in flight
function Line({ m, slot, live, slim, moved, quiet, out }: { m: Match; slot: 1 | 2; live?: [number, number] | null; slim?: boolean; moved?: boolean; quiet?: boolean; out?: boolean }) {
  const { teamById } = useTournament();
  const play = !!useBracketOptions().reveal?.length;
  const side = slot === 1 ? m.team1 : m.team2;
  const team = teamById(side.id);
  if (!team) return <div className="min-h-0 flex-1" />;
  const won = !live && m.winner === slot;
  const lost = !live && m.winner !== null && !won && !quiet;
  const tie = !!live && live[0] === live[1];
  const leads = !!live && !tie && live[slot - 1] > live[2 - slot];
  const score = live ? live[slot - 1] : m.winner !== null ? (side.score ?? 0) : null;
  return (
    <div {...meT(team.id)} className={cn("relative flex min-h-0 flex-1 items-center gap-1.5 pl-2 pr-2.5 transition-[opacity,background-color] duration-700", won && "bg-[color-mix(in_oklab,var(--balkan)_14%,var(--coal))]", leads && "bg-rose/10", lost && "opacity-45")}>
      {/* knocked out: a red flash as the line fades */}
      {out && <motion.span className="pointer-events-none absolute inset-0 bg-rose/35" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.4, delay: 0.2 }} aria-hidden />}
      {(won || leads) && <span className={cn("absolute inset-y-1 left-0 w-0.5", won ? "bg-balkan" : "bg-rose/60")} aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!slim && <img src={team.image} alt="" className={cn("size-4 shrink-0 rounded-full object-cover", moved ? "outline-1 outline-gold" : "in-pop")} style={cssVars({ "--d": "0.45s" })} />}
      <span title={team.name} className={cn("min-w-0 flex-1 truncate text-[12.8px] font-display font-bold", moved ? "text-gold-hi" : "in-wipe", won && "font-display font-black text-paper", leads && "font-display font-black text-rose-hi")} style={cssVars({ "--d": "0.5s" })}>
        {team.name}
      </span>
      <MeTag t={team.id} className="me-tag-plain me-tag-px -mx-1" />
      {score !== null && (
        <span className={cn("num ml-2 shrink-0 text-right text-base leading-none", !moved && "in-slam", won ? "text-balkan-hi" : leads || tie ? "text-rose-hi" : "text-paper/80")} style={cssVars({ "--d": play ? "0s" : "0.65s" })}>
          {score}
        </span>
      )}
    </div>
  );
}

function Box({ id, m, live, slim, moved = [], quiet, out, className, style, onEnter, onLeave }: { id: string; m: Match; live?: [number, number] | null; slim?: boolean; moved?: number[]; quiet?: 1 | 2; out?: 1 | 2; className?: string; style?: React.CSSProperties; onEnter?: () => void; onLeave?: () => void }) {
  const t = useDict();
  const lang = useLang();
  const locale = localeOf(lang);
  const day = (dt: string) => fmtDate(new Date(dt), locale, id === GF_RESET ? { day: "2-digit", month: "short" } : { weekday: "short", day: "2-digit", month: "short" });
  const num = matchNum(useFormat(), id);
  const eyes = useResultsEye();
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} className={cn("flex flex-col overflow-hidden border bg-coal transition-[border-color] duration-200", className)} style={style}>
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-line bg-ink/70 px-2.5">
        <span className="num truncate text-[12.5px] text-paper/75">{m.datetime ? `${day(m.datetime)} · ${fmtSofiaTime(new Date(m.datetime))}` : m.winner ? "" : m.team1.id && m.team2.id ? t.common.tbd : "—"}</span>
        {id === GF_RESET ? (
          <span className="shrink-0 whitespace-nowrap text-[9.6px] font-display font-bold text-gold-hi">{t.rounds.reset}</span>
        ) : (
          !m.datetime && !m.winner && !(m.team1.id && m.team2.id) && <span className={cn("truncate whitespace-nowrap text-[12.5px]", isGfId(id) ? "font-display font-bold text-gold-hi" : "num text-paper/75")}>{roundName(t, m.round)}{num ? `, ${t.nav.match} ${num}` : ""}</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {live !== undefined && <LiveDot />}
          {eyes && m.links.length > 0 && hasResults(m) && <MatchDialog match={m} compact />}
        </span>
      </div>
      <Line m={m} slot={1} live={live} slim={slim} moved={moved.includes(1)} quiet={quiet === 1} out={out === 1} />
      <div className="h-px shrink-0 bg-line" />
      <Line m={m} slot={2} live={live} slim={slim} moved={moved.includes(2)} quiet={quiet === 2} out={out === 2} />
    </div>
  );
}

function LiveDot() {
  const t = useDict();
  return (
    <a href={TWITCH_URL} target="_blank" rel="noreferrer" title={t.common.live} aria-label={t.common.live} className="relative flex size-6 items-center justify-center">
      <span className="absolute size-2.5 animate-ping rounded-full bg-rose/60" aria-hidden />
      <span className="relative size-2 animate-pulse rounded-full bg-rose" aria-hidden />
    </a>
  );
}

export function MatchBracket({ live = {} }: { live?: Record<string, [number, number] | null> }) {
  const t = useDict();
  const { matches: real, format, teamById } = useTournament();
  const { maxH, reset, current, reveal } = useBracketOptions();
  const [play, setPlay] = useState<Play | null>(() => (reveal?.length ? { id: reveal[0], scored: false, loser: false, zoom: false, landed: [], flying: [] } : null));
  // lines a flight landed on ("matchId:slot"): they never replay their intro, also after later cases and the end
  const [kept, setKept] = useState<string[]>([]);
  const latest = useRef(real);
  useEffect(() => {
    latest.current = real;
  });
  const revealKey = reveal?.join() ?? "";
  useEffect(() => {
    if (!reveal?.length) return;
    let dead = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const step = (p: Partial<Play>) => !dead && setPlay((cur) => (cur ? { ...cur, ...p } : cur));
    (async () => {
      setKept([]);
      for (const [n, id] of reveal.entries()) {
        if (dead) return;
        setPlay({ id, scored: false, loser: false, zoom: false, landed: [], flying: [] });
        const m = latest.current.find((x) => x.id === id);
        const moves = m?.winner ? resultMoves(format, m) : [];
        await sleep(PAUSE_MS);
        step({ zoom: true });
        await sleep(ZOOM_S * 1000);
        step({ scored: true });
        await sleep(SETTLE_MS);
        // the winner moves first; the loser moves (or is knocked out) once it has landed
        for (const side of m?.winner ? [m.winner, 3 - m.winner] : []) {
          if (dead) return;
          if (side !== m!.winner) step({ loser: true });
          const go = moves.filter((v) => v.from === side);
          if (go.length) {
            step({ flying: go });
            await sleep(FLY_S * 1000);
            if (dead) return;
            setPlay((cur) => (cur ? { ...cur, flying: [], landed: [...cur.landed, ...go.map((v) => v.team)] } : cur));
            setKept((k) => [...k, ...go.map((v) => `${v.to}:${v.slot}`)]);
          }
          await sleep(AFTER_MS);
        }
        await sleep(HOLD_MS);
        step({ zoom: false });
        await sleep(ZOOM_S * 1000);
        if (n < reveal.length - 1) await sleep(PAUSE_MS);
      }
      if (!dead) setPlay(null);
    })();
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);
  // reveals still to come stay unplayed until their turn
  const queued = play && reveal ? reveal.slice(reveal.indexOf(play.id) + 1) : [];
  const matches = play ? queued.reduce((ms, id) => beforeResult(format, ms, id), beforeResult(format, real, play.id, { scored: play.scored, landed: play.landed })) : real;
  const playing = play ? real.find((m) => m.id === play.id) : undefined;
  const { G, H, P, minW, LOW, POS, top, WIN, DROPS, HEADERS, gfCol, lowRows } = bracketLayout(format);
  const [hover, setHover] = useState<string | null>(null);
  const [end, setEnd] = useState(false);
  const { ref: box, avail: seen } = useFit();
  const avail = availOr(seen);

  const phone = isPhone(seen);
  const gap = phone ? 44 : G;
  const height = LOW + (lowRows - 1) * P + H + 12;
  const fill = maxH && !phone ? Math.min(2, maxH / height) : 0;
  const W = phone ? Math.round(avail - gap) : colWidth(format, avail, fill);
  const shrink = shrinkScale(seen, (gfCol + 1) * minW + gfCol * G);
  const col = (c: number) => c * (W + gap);
  const byId = new Map(matches.map((m) => [m.id, m]));
  const moves = playing?.winner && POS[playing.id] ? resultMoves(format, playing).filter((v) => POS[v.to]) : [];
  const loserSlot = playing?.winner ? ((3 - playing.winner) as 1 | 2) : undefined;
  // the loser of a match that sends nobody down is out
  const knocked = loserSlot && !moves.some((v) => v.from === loserSlot) ? loserSlot : undefined;
  const outlined = play?.id ?? current;
  const lineH = (H - 2 - HEAD - 1) / 2;
  const lineY = (id: string, slot: 1 | 2) => top(id) + 1 + HEAD + (slot - 1) * (lineH + 1);
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
    if (new Set(ids.map((id) => POS[id][2])).size > 1 && !ids.some(isGfId)) return;
    const y0 = Math.min(...ids.map(top)) - 62;
    const y1 = Math.max(...ids.map(top)) + H;
    const base = inner.current.getBoundingClientRect().top + window.scrollY;
    const head = 72;
    const room = window.innerHeight - head;
    const y = y1 - y0 <= room ? base + (y0 + y1) / 2 - head - room / 2 : base + y0 - head - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  const linked = new Set<string>();
  if (hover) for (const [a, b] of DROPS) if (a === hover || b === hover) linked.add(a).add(b);

  const width = col(gfCol) + W + (phone ? gap : 0);
  const zoom = (() => {
    if (!play?.zoom || !POS[play.id]) return { x: 0, y: 0, scale: 1 };
    const ids = [play.id, ...moves.map((v) => v.to)];
    const x0 = Math.min(...ids.map((id) => col(POS[id][0]))) - ZOOM_PAD;
    const x1 = Math.max(...ids.map((id) => col(POS[id][0]) + W)) + ZOOM_PAD;
    const y0 = Math.min(...ids.map(top)) - ZOOM_PAD;
    const y1 = Math.max(...ids.map((id) => top(id) + H)) + ZOOM_PAD;
    const z = Math.min(ZOOM_MAX, width / (x1 - x0), height / (y1 - y0));
    const clamp = (v: number, lo: number) => Math.min(0, Math.max(lo, v));
    return { scale: z, x: clamp(width / 2 - ((x0 + x1) / 2) * z, width - width * z), y: clamp(height / 2 - ((y0 + y1) / 2) * z, height - height * z) };
  })();
  const fitW = shrink < 1 ? shrink : upscale(seen, width);
  const scale = maxH ? Math.min(fitW, maxH / height) : fitW;
  const fit = fitBox(width, height, scale);
  const lowCol = Math.min(...HEADERS.filter((h) => h.s === "l").map((h) => h.c));
  const midY = (id: string) => top(id) + H / 2;
  const firstTop = (c: number, s: Half) => Math.min(...Object.keys(POS).filter((id) => !isGfId(id) && POS[id][0] === c && POS[id][2] === s).map(top));
  const wire = (a: string, b: string) => wirePath(col(POS[a][0]) + W, midY(a), col(POS[b][0]), midY(b), gap);
  const drop = (a: string, b: string) => {
    // same-column drops (LR1) are straight verticals that overlap each other and read as solid; spread them apart
    const srcs = POS[a][0] === POS[b][0] ? DROPS.filter(([, to]) => to === b).map(([from]) => from) : [a];
    const off = (srcs.indexOf(a) - (srcs.length - 1) / 2) * (W / 4);
    const x1 = col(POS[a][0]) + W / 2 + off;
    const x2 = col(POS[b][0]) + W / 2 + off;
    const y1 = top(a) + H;
    const y2 = top(b);
    return `M${x1} ${y1} C${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
  };

  const section = (s: "u" | "l") => (
    <div className="pointer-events-none absolute flex items-center gap-3" style={{ left: s === "u" ? 0 : col(lowCol), top: s === "u" ? 0 : LOW - 100 }}>
      <span className={cn("in-wipe heading-slam whitespace-nowrap text-xl sm:text-3xl", s === "u" ? "bsec-u" : "bsec-l text-rose-hi")} style={cssVars({ "--d": s === "u" ? "0.1s" : "0.4s" })}>
        {s === "u" ? t.schedule.upper : t.schedule.lower}
      </span>
    </div>
  );


  return (
    <div className="relative">
    <div ref={box} onScroll={onScroll} className="snap-x snap-mandatory overflow-x-auto overflow-y-hidden pb-4 md:snap-none">
      <div className="mx-auto mt-4" style={fit.outer}>
      <div ref={inner} className={cn("relative [--spacing:4px] [--text-xs:12px] [--text-base:16px] [--text-xl:20px] [--text-3xl:30px]", scale === 1 && "mx-auto", reveal && "overflow-hidden")} style={fit.inner}>
      <motion.div className="absolute inset-0" style={{ originX: 0, originY: 0 }} initial={false} animate={zoom} transition={{ duration: ZOOM_S, ease: EASE_IO }}>
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
          {Object.entries(WIN).map(([a, b]) => {
            const done = !!byId.get(a)?.winner;
            return (
              <path
                key={a}
                d={wire(a, b)}
                pathLength={1}
                className="in-draw"
                style={cssVars({ "--d": `${0.6 + POS[a][0] * 0.14}s` })}
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
          {reset && <path d={`M${col(gfCol) + W / 2} ${top(GF) + H} V${top(GF_RESET)}`} strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="3 4" className="in-up" style={cssVars({ "--d": "1.3s", stroke: "var(--gold)" })} />}
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
                style={{ left: col(h.c), top: y - 30, width: W, ...cssVars({ "--i": h.c, "--s": "0.12s", "--d": h.s === "u" ? "0.15s" : "0.45s" }) }}
              >
                {roundName(t, h.t)}
              </div>
            </div>
          );
        })}
        <div
          className="in-drop absolute flex snap-start items-center gap-2 border-b border-gold/20 pb-1 text-xs font-display font-bold text-gold-hi/80"
          style={{ left: col(gfCol), top: top(GF) - 30, width: W, ...cssVars({ "--d": "0.7s" }) }}
        >
          <Crown className="size-3.5" /> {roundName(t, gfRound(format))}
        </div>

        {Object.keys(POS).map((id) => {
          const m = byId.get(id);
          if (!m || (!reset && id === GF_RESET)) return null;
          const [c] = POS[id];
          const gf = isGfId(id);
          return (
            <Box
              key={id}
              id={id}
              m={m}
              live={id in live ? live[id] : undefined}
              slim={W < 200}
              moved={([1, 2] as const).filter((s) => kept.includes(`${id}:${s}`))}
              quiet={id === play?.id && !play.loser ? loserSlot : undefined}
              out={id === play?.id && play.loser ? knocked : undefined}
              onEnter={() => setHover(id)}
              onLeave={() => setHover(null)}
              className={cn("in-left-far absolute", gf ? "border-gold/70" : "border-line hover:border-paper/30", linked.has(id) && "z-10 border-rose shadow-[0_0_14px_-3px_var(--rose)]", id === outlined && "z-10 border-gold shadow-[0_0_0_1px_var(--gold),0_0_18px_-4px_var(--gold)]")}
              style={{ left: col(c), top: top(id), width: W, height: H, ...cssVars({ "--i": c, "--s": "0.14s", "--d": `${(POS[id][2] === "u" ? 0.2 : 0.5) + POS[id][1] / 2500}s` }) }}
            />
          );
        })}
        {/* flights are drawn over the boxes, since a box clips its own lines */}
        {playing &&
          play?.flying.map((v) => {
            const team = teamById(v.team);
            if (!team) return null;
            const x0 = col(POS[playing.id][0]);
            const y0 = lineY(playing.id, v.from);
            // lands exactly on the line it becomes, which then shows without an intro
            return (
              <motion.div
                key={v.to + v.slot}
                className="pointer-events-none absolute z-20 flex items-center gap-1.5 pl-2 pr-2.5"
                style={{ left: x0, top: y0, width: W, height: lineH }}
                initial={{ x: 0, y: 0 }}
                animate={{ x: col(POS[v.to][0]) - x0, y: lineY(v.to, v.slot) - y0 }}
                transition={{ duration: FLY_S, ease: EASE_IO }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {W >= 200 && <img src={team.image} alt="" className="gild size-4 shrink-0 rounded-full object-cover outline-1 outline-transparent" style={cssVars({ "--gild": `${FLY_S}s` })} />}
                <span className="gild min-w-0 flex-1 truncate text-[12.8px] font-display font-bold" style={cssVars({ "--gild": `${FLY_S}s` })}>{team.name}</span>
              </motion.div>
            );
          })}
      </motion.div>
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
