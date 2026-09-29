"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Hourglass } from "lucide-react";
import { useDict } from "@/components/site/lang";
import type { Pooler, Voter } from "@/db/pool-sheet";
import { scoreColor } from "@/lib/score-color";

export function VotesPop({ label, votes, waiting, avg }: { label: string; votes: Voter[]; waiting: Pooler[]; avg: number | null }) {
  const t = useDict();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [at, setAt] = useState<{ top: number; left: number; up: boolean } | null>(null);

  const open = () => {
    clearTimeout(timer.current);
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = 288;
    const up = r.top > window.innerHeight / 2;
    setAt({ top: up ? r.top - 10 : r.bottom + 10, left: Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w)), up });
  };
  const close = () => {
    clearTimeout(timer.current);
    setAt(null);
  };
  const later = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAt(null), 220);
  };
  const stay = () => clearTimeout(timer.current);

  useEffect(() => {
    if (!at) return;
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && pop.current?.contains(e.target)) return;
      setAt(null);
    };
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && (pop.current?.contains(e.target) || btn.current?.contains(e.target))) return;
      setAt(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAt(null);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", close);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", close);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [at]);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <button
        ref={btn}
        type="button"
        onPointerEnter={(e) => e.pointerType === "mouse" && open()}
        onPointerLeave={(e) => e.pointerType === "mouse" && later()}
        onFocus={open}
        onClick={() => (at ? close() : open())}
        aria-expanded={!!at}
        className="num mt-1 cursor-help border-b border-dashed border-ash/60 text-[0.68rem] font-bold uppercase text-ash transition-colors hover:border-paper hover:text-paper"
      >
        {label}
      </button>
      {at &&
        createPortal(
          <div
            ref={pop}
            role="dialog"
            aria-label={t.admin.whoVoted}
            onPointerEnter={stay}
            onPointerLeave={(e) => e.pointerType === "mouse" && later()}
            className="fixed z-[80] w-72 overscroll-contain"
            style={{ top: at.top, left: at.left, transform: at.up ? "translateY(-100%)" : undefined }}
          >
            <span className={at.up ? "absolute inset-x-0 -bottom-3 h-3" : "absolute inset-x-0 -top-3 h-3"} aria-hidden />
            <div className="vote-pop border border-line bg-coal shadow-[5px_5px_0_0_var(--color-rose-deep)]">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-ink/60 px-3 py-2">
                <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-ash">{t.admin.whoVoted}</span>
                {avg !== null && (
                  <span className="num text-sm font-black" style={{ color: scoreColor(avg) }}>
                    {avg.toFixed(1)}
                    <span className="text-[0.65rem] text-ash">/10</span>
                  </span>
                )}
              </div>
              <ul className="max-h-80 divide-y divide-line/60 overflow-y-auto overscroll-contain">
                {votes.map((v, i) => (
                  <li key={v.osuId} className="vote-pop-row flex items-center gap-2.5 px-3 py-2" style={{ "--i": i } as React.CSSProperties}>
                    {v.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.avatar}
                        alt=""
                        className="size-8 shrink-0 rounded-full object-cover ring-2 ring-offset-2 ring-offset-coal"
                        style={{ "--tw-ring-color": scoreColor(v.score) } as React.CSSProperties}
                      />
                    ) : (
                      <span className="size-8 shrink-0 rounded-full bg-slate" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{v.username}</span>
                    <span className="num grid min-w-12 -skew-x-12 place-items-center px-1.5 py-0.5 text-xs font-black text-ink" style={{ background: scoreColor(v.score) }}>
                      <span className="skew-x-12">
                        {v.score}
                        <span className="opacity-70">/10</span>
                      </span>
                    </span>
                  </li>
                ))}
                {waiting.map((p, i) => (
                  <li key={p.osuId} className="vote-pop-row flex items-center gap-2.5 px-3 py-2 opacity-55" style={{ "--i": votes.length + i } as React.CSSProperties}>
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar} alt="" className="size-8 shrink-0 rounded-full object-cover grayscale ring-2 ring-line ring-offset-2 ring-offset-coal" />
                    ) : (
                      <span className="size-8 shrink-0 rounded-full bg-slate" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.username}</span>
                    <Hourglass className="size-3.5 text-ash" />
                  </li>
                ))}
                {votes.length === 0 && waiting.length === 0 && <li className="px-3 py-3 text-sm text-ash">{t.admin.noVotes}</li>}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
