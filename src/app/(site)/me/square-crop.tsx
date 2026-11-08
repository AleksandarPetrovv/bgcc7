"use client";

import { useRef, useState } from "react";
import { Popup, PopupTitle } from "@/components/site/popup";
import { SlantButton } from "@/components/site/slant";
import { useDict } from "@/components/site/lang";

export type CropSrc = { url: string; w: number; h: number };

// the server scales to 256 anyway; this only keeps the png small
const OUT_MAX = 1024;
const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** drag the square to move it, drag its corner to resize it; returns the square as a png */
export function SquareCrop({ src, onDone, onCancel }: { src: CropSrc; onDone: (f: File) => void; onCancel: () => void }) {
  const r = useDict().teamReq;
  const { w, h } = src;
  const side = Math.min(w, h);
  const min = Math.max(16, Math.round(side / 10));
  const [box, setBox] = useState({ x: (w - side) / 2, y: (h - side) / 2, s: side });
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; box: typeof box; resize: boolean } | null>(null);

  const start = (e: React.PointerEvent, resize: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, box, resize };
  };
  const move = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || !img.current) return;
    const k = w / img.current.clientWidth;
    const dx = (e.clientX - g.px) * k;
    const dy = (e.clientY - g.py) * k;
    const b = g.box;
    if (g.resize) setBox({ ...b, s: clamp(b.s + Math.max(dx, dy), min, Math.min(w - b.x, h - b.y)) });
    else setBox({ ...b, x: clamp(b.x + dx, 0, w - b.s), y: clamp(b.y + dy, 0, h - b.s) });
  };
  const end = () => (drag.current = null);

  const key = (e: React.KeyboardEvent) => {
    const step = side / 50;
    const [dx, dy] = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key] ?? [];
    if (dx === undefined) return;
    e.preventDefault();
    setBox((b) => ({ ...b, x: clamp(b.x + dx, 0, w - b.s), y: clamp(b.y + dy, 0, h - b.s) }));
  };

  const use = () => {
    const out = Math.min(Math.round(box.s), OUT_MAX);
    const c = document.createElement("canvas");
    c.width = c.height = out;
    c.getContext("2d")!.drawImage(img.current!, box.x, box.y, box.s, box.s, 0, 0, out, out);
    c.toBlob((b) => b && onDone(new File([b], "team.png", { type: "image/png" })), "image/png");
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <Popup onClose={onCancel} tone="rose" shadow={6} className="max-w-lg p-5 sm:p-6" label={r.cropTitle}>
      <PopupTitle className="in-up heading-slam pr-6 text-2xl" style={d(0.1)}>
        {r.cropTitle}
      </PopupTitle>
      <p className="in-up mt-1.5 text-sm text-ash" style={d(0.16)}>
        {r.cropHint}
      </p>
      <div className="in-up mt-5 flex justify-center" style={d(0.22)}>
        <div className="relative w-fit touch-none select-none overflow-hidden" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={img} src={src.url} alt="" draggable={false} className="block max-h-[50dvh] max-w-full" />
          <div
            role="slider"
            tabIndex={0}
            aria-label={r.cropTitle}
            aria-valuenow={Math.round(box.x)}
            onKeyDown={key}
            onPointerDown={(e) => start(e, false)}
            className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] outline-none focus-visible:border-rose"
            style={{ left: pct(box.x, w), top: pct(box.y, h), width: pct(box.s, w), height: pct(box.s, h) }}
          >
            <span className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-white/80" aria-hidden />
            <span onPointerDown={(e) => start(e, true)} className="absolute bottom-0 right-0 size-5 cursor-nwse-resize border-2 border-white bg-rose" aria-hidden />
          </div>
        </div>
      </div>
      <div className="in-up mt-6 flex justify-center gap-3" style={d(0.3)}>
        <SlantButton tone="outline" onClick={onCancel} className="px-6 py-2.5">
          {r.cancel}
        </SlantButton>
        <SlantButton onClick={use} className="px-6 py-2.5">
          {r.cropUse}
        </SlantButton>
      </div>
    </Popup>
  );
}
