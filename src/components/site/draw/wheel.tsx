"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { DrawPlayer } from "@/lib/draw";
import { Pfp } from "@/components/site/pfp";
import { cn } from "@/lib/utils";

// only the wedge layer turns; avatars and names stay upright and are moved, never rotated, so they stay crisp
export type Tone = "rose" | "balkan";
const SHADES: Record<Tone, string[]> = {
  rose: ["var(--rose)", "var(--rose-soft)", "var(--rose-light)"],
  balkan: ["var(--balkan)", "color-mix(in srgb, var(--balkan) 50%, var(--white))", "color-mix(in srgb, var(--balkan) 75%, var(--white))"],
};
const SPIN_MS = 5600;
const TURNS = 6;
const SETTLE_MS = 1100;
const R = 96;

type Entry = { p: DrawPlayer; w: number; to: number };

const ease = (t: number) => 1 - Math.pow(1 - t, 4.2);
const norm = (a: number) => ((a % 360) + 360) % 360;
const pt = (a: number, r: number) => [100 + r * Math.sin((a * Math.PI) / 180), 100 - r * Math.cos((a * Math.PI) / 180)] as const;

function wedge(a0: number, a1: number) {
  const [x0, y0] = pt(a0, R);
  const [x1, y1] = pt(a1, R);
  return `M100 100L${x0} ${y0}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}Z`;
}

/** wedge start angles (0 = top, clockwise) from the entry weights */
function layout(es: Entry[]) {
  const total = es.reduce((s, e) => s + e.w, 0) || 1;
  let at = 0;
  return es.map((e) => {
    const span = (e.w / total) * 360;
    const out = { e, a0: at, a1: at + span, mid: at + span / 2, span };
    at += span;
    return out;
  });
}

export function Wheel({ players, tone, spin, onLanded, onLive, dim, empty, hub }: {
  players: DrawPlayer[];
  empty: string;
  /** the tier letter in the middle */
  hub: string;
  tone: Tone;
  /** animate to this player; a new `key` starts a new spin */
  spin: { id: number; key: number } | null;
  onLanded: () => void;
  /** the player under the pointer while it turns, then the winner */
  onLive: (p: DrawPlayer | null) => void;
  dim?: boolean;
}) {
  const reduce = useReducedMotion();
  const es = useRef<Entry[]>(players.map((p) => ({ p, w: 1, to: 1 })));
  // what the last frame drew; the refs hold the moving numbers between frames
  const [view, setView] = useState(() => ({ rot: 0, es: players.map((p) => ({ p, w: 1, to: 1 })) }));
  const rot = useRef(0);
  const run = useRef<{ from: number; to: number; t0: number; ms: number; id: number } | null>(null);
  const raf = useRef(0);
  const last = useRef(0);
  const under = useRef<number | null>(null);
  const pointer = useRef<SVGSVGElement>(null);
  const [won, setWon] = useState<number | null>(null);
  const cb = useRef({ onLanded, onLive });
  useEffect(() => {
    cb.current = { onLanded, onLive };
  });

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - (last.current || now)) / 1000);
    last.current = now;
    let busy = false;
    for (const e of es.current) {
      if (Math.abs(e.to - e.w) > 0.002) {
        e.w += (e.to - e.w) * Math.min(1, dt * 7);
        busy = true;
      } else e.w = e.to;
    }
    es.current = es.current.filter((e) => e.to > 0 || e.w > 0.002);
    const r = run.current;
    if (r) {
      const t = Math.min(1, (now - r.t0) / r.ms);
      rot.current = r.from + (r.to - r.from) * ease(t);
      const hit = layout(es.current).find((s) => norm(-rot.current) >= s.a0 && norm(-rot.current) < s.a1)?.e.p ?? null;
      if (hit && hit.id !== under.current) {
        under.current = hit.id;
        cb.current.onLive(hit);
        pointer.current?.animate([{ transform: "translateY(0)" }, { transform: "translateY(-18%)" }, { transform: "translateY(0)" }], { duration: 110, easing: "ease-out" });
      }
      if (t >= 1) {
        run.current = null;
        setWon(r.id);
        setTimeout(() => {
          setWon(null);
          cb.current.onLanded();
        }, SETTLE_MS);
      } else busy = true;
    }
    setView({ rot: rot.current, es: es.current.map((e) => ({ ...e })) });
    raf.current = busy ? requestAnimationFrame(tick) : 0;
    if (!busy) last.current = 0;
  };
  const wake = () => {
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );

  // players leaving shrink their wedge away, players coming back (undo) grow one in, in seed order
  const ids = players.map((p) => p.id).join();
  useEffect(() => {
    const keep = new Set(players.map((p) => p.id));
    for (const e of es.current) e.to = keep.has(e.p.id) ? 1 : 0;
    for (const p of players) if (!es.current.some((e) => e.p.id === p.id)) es.current.push({ p, w: 0, to: 1 });
    es.current.sort((a, b) => a.p.seed - b.p.seed);
    wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  useEffect(() => {
    if (!spin) return;
    const s = layout(es.current).find((x) => x.e.p.id === spin.id);
    if (!s) return;
    const jitter = (Math.random() - 0.5) * s.span * 0.6;
    const from = rot.current;
    const to = from + (reduce ? 0 : TURNS * 360) + norm(-(s.mid + jitter) - from);
    run.current = { from, to, t0: performance.now(), ms: reduce ? 900 : SPIN_MS, id: spin.id };
    under.current = null;
    wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.key]);

  const slices = layout(view.es);
  const n = view.es.reduce((s, e) => s + e.w, 0);
  const orbit = 31;
  const size = Math.min(19, 1.56 * orbit * Math.sin(Math.PI / Math.max(n, 2)));
  const shades = SHADES[tone];

  return (
    <div className={cn("relative aspect-square w-full transition-opacity duration-500 [container-type:inline-size]", dim && "opacity-55")}>
      {slices.length === 0 ? (
        <div className="absolute inset-[2%] grid place-items-center rounded-full border-2 border-dashed border-line text-sm font-display font-bold text-ash">{empty}</div>
      ) : (
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <circle cx={100} cy={100} r={R + 3} className="fill-paper" />
          <g transform={`rotate(${view.rot} 100 100)`}>
            {slices.map((s, i) => {
              const fill = s.e.p.id === won ? "var(--gold)" : shades[slices.length % 2 && i === slices.length - 1 && i > 0 ? 2 : i % 2];
              return slices.length === 1 && s.span > 359.9 ? (
                <circle key={s.e.p.id} cx={100} cy={100} r={R} style={{ fill, transition: "fill 650ms var(--ease)" }} />
              ) : (
                <path key={s.e.p.id} d={wedge(s.a0, s.a1)} style={{ fill, transition: "fill 650ms var(--ease)" }} stroke="var(--paper)" strokeWidth={0.8} strokeLinejoin="round" />
              );
            })}
            {slices.length > 1 &&
              slices.map((s) => {
                const [x0, y0] = pt(s.a0, R - 1.2);
                const [x1, y1] = pt(s.a0, R - 9);
                return <line key={s.e.p.id} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={1.6} strokeLinecap="round" className="stroke-ink" />;
              })}
          </g>
          <circle cx={100} cy={100} r={17} className="fill-ink stroke-paper" strokeWidth={3} />
        </svg>
      )}
      {slices.length > 0 && (
        <span className={cn("absolute inset-0 grid place-items-center text-[min(2.4rem,7cqw)] font-display font-black", tone === "rose" ? "text-rose-hi" : "text-balkan-hi")} aria-hidden>
          {hub}
        </span>
      )}
      {slices.map((s) => {
        // a player who just left (to the box) is gone at once, so only one copy exists when the flight starts
        if (s.e.to === 0 || !players.some((p) => p.id === s.e.p.id)) return null;
        const [x, y] = pt(s.mid + view.rot, orbit * 2);
        return (
          <div key={s.e.p.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x / 2}%`, top: `${y / 2}%`, width: `${size}%`, height: `${size}%` }}>
            <div data-fly={s.e.p.id} className={cn("size-full rounded-full", s.e.p.id === won && "ring-4 ring-gold")}>
              <Pfp src={s.e.p.avatar} className="size-full shadow-[0_0_0_2px_var(--paper)]" />
            </div>
          </div>
        );
      })}
      <span className="absolute left-1/2 top-[-5%] block w-[9%] -translate-x-1/2" aria-hidden>
        <svg ref={pointer} viewBox="0 0 20 22" className="block w-full overflow-visible drop-shadow-[0_2px_0_var(--gold-shadow)]">
          <path d="M2 1h16L10 21Z" className="fill-gold stroke-paper" strokeWidth={2} strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}
