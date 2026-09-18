"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#e0242f", "#f24a54", "#0fa06a", "#f4f3ee", "#e8c547", "#3b82f6"];

export function Confetti({ duration = 2500, onDone }: { duration?: number; onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    size();
    window.addEventListener("resize", size);
    const W = () => canvas.width;
    const H = () => canvas.height;
    const make = () => {
      const side = Math.floor(Math.random() * 5);
      const w = W();
      const h = H();
      const [x, y, dir] =
        side === 0
          ? [0, Math.random() * h, 0]
          : side === 1
            ? [w, Math.random() * h, Math.PI]
            : side === 2
              ? [Math.random() * w, h, -Math.PI / 2]
              : side === 3
                ? [Math.random() * w, 0, Math.PI / 2]
                : [w / 2 + (Math.random() - 0.5) * w * 0.3, h / 2 + (Math.random() - 0.5) * h * 0.3, Math.random() * Math.PI * 2];
      const ang = dir + (Math.random() - 0.5) * (side === 4 ? Math.PI * 2 : Math.PI * 0.9);
      const sp = (8 + Math.random() * 18) * dpr;
      return {
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        w: (5 + Math.random() * 9) * dpr,
        h: (3 + Math.random() * 5) * dpr,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        flip: Math.random() * Math.PI,
        wob: 0.5 + Math.random() * 2,
      };
    };
    const count = 320;
    let owed = 0;
    let parts: ReturnType<typeof make>[] = [];
    let start = 0;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = Math.min(4, (now - last) / 16.7);
      last = now;
      const t = now - start;
      ctx.clearRect(0, 0, W(), H());
      const fade = t > duration - 600 ? Math.max(0, (duration - t) / 600) : 1;
      if (t < duration - 900) {
        owed += 5 * dt;
        for (; owed >= 1; owed--) parts.push(make());
      }
      for (const p of parts) {
        p.vy += 0.3 * dpr * dt;
        p.vx *= 0.97;
        p.vy *= 0.985;
        p.x += p.vx * dt + Math.sin((t + p.flip * 500) / 180) * p.wob * dpr;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        p.flip += 0.2 * dt;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.flip));
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < duration) raf = requestAnimationFrame(tick);
      else done.current?.();
    };
    let started = false;
    const go = () => {
      if (started || document.visibilityState !== "visible" || !document.hasFocus()) return;
      started = true;
      window.removeEventListener("focus", go);
      document.removeEventListener("visibilitychange", go);
      parts = Array.from({ length: count }, make);
      start = last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("focus", go);
    document.addEventListener("visibilitychange", go);
    go();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("focus", go);
      document.removeEventListener("visibilitychange", go);
    };
  }, [duration]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[90] size-full" aria-hidden />;
}
