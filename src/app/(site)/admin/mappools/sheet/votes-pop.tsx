"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnchoredPopup, type PopPlace } from "@/components/site/anchored-popup";
import { Hourglass } from "lucide-react";
import { useDict } from "@/components/site/lang";
import type { Pooler, Voter } from "@/db/pool-sheet";
import { scoreColor, scoreText } from "@/lib/score-color";
import { SlantBg } from "@/components/site/slant";


export function VotesPop({ label, votes, waiting, avg }: { label: string; votes: Voter[]; waiting: Pooler[]; avg: number | null }) {
  const t = useDict();
  const btn = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);

  const show = () => {
    clearTimeout(timer.current);
    const r = btn.current?.getBoundingClientRect();
    if (r) setUp(r.top > window.innerHeight / 2);
    setOpen(true);
  };
  const close = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);
  const later = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 220);
  };
  const stay = () => clearTimeout(timer.current);
  useEffect(() => () => clearTimeout(timer.current), []);

  const place = useCallback(
    (r: DOMRect): PopPlace => {
      const width = Math.min(416, window.innerWidth - 24);
      return { left: Math.max(12, Math.min(window.innerWidth - width - 12, r.right - width)), top: up ? r.top - 10 : r.bottom + 10, width, up };
    },
    [up],
  );

  return (
    <>
      <button
        ref={btn}
        type="button"
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && later()}
        onFocus={show}
        onClick={() => (open ? close() : show())}
        aria-expanded={open}
        className="num block cursor-help border-b border-dashed border-ash/60 text-[0.68rem] font-display font-bold uppercase text-ash transition-colors hover:border-paper hover:text-paper"
      >
        {label}
      </button>
      <AnchoredPopup
        anchor={btn}
        open={open}
        onClose={close}
        place={place}
        chrome={false}
        role="dialog"
        aria-label={t.admin.whoVoted}
        onPointerEnter={stay}
        onPointerLeave={(e) => e.pointerType === "mouse" && later()}
        className="z-[80] overscroll-contain"
      >
            <span className={up ? "absolute inset-x-0 -bottom-3 h-3" : "absolute inset-x-0 -top-3 h-3"} aria-hidden />
            <div className="vote-pop border border-line bg-coal shadow-[5px_5px_0_0_var(--rose-deep)]">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-ink/60 px-3 py-2">
                <span className="text-[0.68rem] font-display font-bold text-ash">{t.admin.whoVoted}</span>
                {avg !== null && (
                  <span className="num text-sm font-display font-black" style={{ color: scoreText(avg) }}>
                    {avg.toFixed(1)}
                    <span className="text-[0.65rem] text-ash">/10</span>
                  </span>
                )}
              </div>
              <ul className="max-h-[28rem] divide-y divide-line/60 overflow-y-auto overscroll-contain">
                {votes.map((v, i) => (
                  <li key={v.osuId} className="vote-pop-row flex items-start gap-3 px-3.5 py-2.5" style={{ "--i": i } as React.CSSProperties}>
                    {v.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.avatar}
                        alt=""
                        className="mt-0.5 size-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="size-8 shrink-0 rounded-full bg-slate" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-display font-bold">{v.username}</span>
                        <span
                          className="num relative isolate grid min-w-12 shrink-0 place-items-center px-1.5 py-0.5 text-xs font-display font-black"
                          style={{ color: scoreText(v.score) }}
                        >
                          <SlantBg className="border" style={{ background: `color-mix(in srgb, ${scoreColor(v.score)} 16%, transparent)`, borderColor: scoreColor(v.score) }} />
                          <span>
                            {v.score}
                            <span className="opacity-70">/10</span>
                          </span>
                        </span>
                      </span>
                      {v.note ? (
                        <span className="mt-1 block whitespace-pre-wrap break-words border-l-2 border-line pl-2 text-[0.8rem] leading-snug text-paper/80">{v.note}</span>
                      ) : (
                        <span className="mt-1 block text-xs italic text-ash">{t.admin.noNote}</span>
                      )}
                    </span>
                  </li>
                ))}
                {waiting.map((p, i) => (
                  <li key={p.osuId} className="vote-pop-row flex items-center gap-2.5 px-3 py-2 opacity-55" style={{ "--i": votes.length + i } as React.CSSProperties}>
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar} alt="" className="size-8 shrink-0 rounded-full object-cover grayscale" />
                    ) : (
                      <span className="size-8 shrink-0 rounded-full bg-slate" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-display font-bold">{p.username}</span>
                    <Hourglass className="size-3.5 text-ash" />
                  </li>
                ))}
                {votes.length === 0 && waiting.length === 0 && <li className="px-3 py-3 text-sm text-ash">{t.admin.noVotes}</li>}
              </ul>
            </div>
      </AnchoredPopup>
    </>
  );
}
