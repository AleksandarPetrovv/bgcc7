"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionGlobalConfig, useReducedMotion } from "motion/react";
import type { OverlayFeed } from "@/lib/overlay-types";
import type { Scene } from "@/lib/scenes";
import { useSSE } from "@/components/site/use-sse";
import { DemoBar } from "@/components/site/demo-bar";
import { CalmScene } from "./calm-scenes";
import { MappoolScene } from "./mappool-scene";
import { GameplayScene } from "./gameplay-scene";
import { BracketScene, ScheduleScene } from "./schedule-scenes";
import styles from "./overlay-view.module.css";

export function OverlayView({ overlayKey, scene, stage }: { overlayKey: string; scene?: Scene; stage?: string }) {
  // the demo bar's last seek; `n` makes a repeat of the same spot reconnect too
  const [seek, setSeek] = useState<{ ms: number; n: number } | null>(null);
  const demo = overlayKey === "demo";
  const q = new URLSearchParams();
  if (demo && scene) q.set("scene", scene);
  if (demo && stage) q.set("stage", stage);
  if (demo && seek) {
    q.set("t", (seek.ms / 1000).toFixed(1));
    q.set("n", String(seek.n));
  }
  const query = q.size ? `?${q}` : "";
  const url = `/api/overlay/${encodeURIComponent(overlayKey)}${query}`;

  return <OverlaySubscription key={JSON.stringify([overlayKey, scene, stage])} url={url} onSeek={demo ? (ms) => setSeek((s) => ({ ms, n: (s?.n ?? 0) + 1 })) : undefined} />;
}

const WIPE_S = 1.05;
const SWAP_MS = 520;

function OverlaySubscription({ url, onSeek }: { url: string; onSeek?: (ms: number) => void }) {
  const [feed, setFeed] = useState<OverlayFeed | null>(null);
  const reducedMotion = useReducedMotion();
  const build = useRef<string | undefined>(undefined);
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(expiry.current), []);
  useSSE(url, (data) => {
    try {
      const next: OverlayFeed | null = JSON.parse(data);
      if (next?.build) {
        // new deploy: OBS has nobody to click, so pick up the new bundle on its own
        if (build.current && build.current !== next.build) return window.location.reload();
        build.current = next.build;
      }
      clearTimeout(expiry.current);
      if (!next?.live) {
        setFeed(next);
        return;
      }

      const age = Math.max(0, next.at - next.live.at);
      const remaining = Math.max(0, 10000 - age);
      if (remaining === 0) {
        setFeed({ ...next, live: null });
        return;
      }

      setFeed(next);
      expiry.current = setTimeout(() => setFeed((current) => current === next ? { ...current, live: null } : current), remaining);
    } catch (e) {
      console.warn("overlay frame dropped", e);
    }
  });

  useEffect(() => {
    const sync = () => {
      MotionGlobalConfig.skipAnimations = document.hidden;
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const target = feed ? `${feed.match.id}:${feed.scene}` : null;
  const [shown, setShown] = useState<string | null>(target);
  const [wipe, setWipe] = useState(0);
  const [prevTarget, setPrevTarget] = useState(target);
  if (target !== shown) {
    if (shown === null || target === null || reducedMotion || document.hidden) setShown(target);
    else if (target !== prevTarget) setWipe((w) => w + 1);
  }
  if (target !== prevTarget) setPrevTarget(target);
  useEffect(() => {
    if (target === shown) return;
    const swap = setTimeout(() => setShown(target), SWAP_MS);
    return () => clearTimeout(swap);
  }, [target, shown]);

  const [held, setHeld] = useState<OverlayFeed | null>(null);
  if (feed && target === shown && held !== feed) setHeld(feed);
  const scene = (shown?.slice(shown.lastIndexOf(":") + 1) ?? feed?.scene) as OverlayFeed["scene"];
  const base = target === shown ? feed : held ?? feed;
  const view = base && shown ? { ...base, scene } : null;

  return (
    <>
    <StageFrame>
      {view && (
        <div key={shown} className={styles.scene}>
          {scene === "gameplay" ? <GameplayScene feed={view} /> : scene === "mappool" ? <MappoolScene feed={view} /> : scene === "schedule" ? <ScheduleScene feed={view} /> : scene === "bracket" ? <BracketScene feed={view} /> : <CalmScene feed={view} />}
        </div>
      )}
      <AnimatePresence>{wipe > 0 && <Wipe key={wipe} />}</AnimatePresence>
    </StageFrame>
    {onSeek && feed?.demo && <DemoBar t={feed.demo.t} len={feed.demo.len} onSeek={onSeek} />}
    </>
  );
}

const SWEEP = [
  { c: "var(--white)", d: 0 },
  { c: "var(--balkan)", d: 0.07 },
  { c: "var(--rose)", d: 0.14 },
];

function Wipe() {
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0 } }}>
      {SWEEP.map((s, i) => (
        <motion.span
          key={i}
          className="absolute inset-y-[-10%] left-0 w-[2600px] -skew-x-12"
          style={{ background: s.c, boxShadow: "-24px 0 0 0 color-mix(in srgb, var(--black) 35%, transparent)" }}
          initial={{ x: -2900 }}
          animate={{ x: 2300 }}
          transition={{ duration: WIPE_S, delay: s.d, ease: [0.76, 0, 0.24, 1] }}
        />
      ))}
    </motion.div>
  );
}

/** the overlay's 1920x1080 stage, fitted to the window (`inline`: to its own box instead, for a view inside a page) */
export function StageFrame({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  const stage = <div className={styles.stage}>{children}</div>;
  return inline ? <InlineFit>{stage}</InlineFit> : <Fit>{stage}</Fit>;
}

function InlineFit({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1920);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative aspect-video w-full overflow-hidden">
      {scale > 0 && <div className="absolute left-0 top-0" style={{ zoom: scale }}>{children}</div>}
    </div>
  );
}

function Fit({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [boxed, setBoxed] = useState(false);
  useEffect(() => {
    const fit = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
      // only an exact 16:9 window (the OBS source) stays transparent; anything else gets ink behind the stage so no page shows at the edges
      setBoxed(window.innerWidth * 9 !== window.innerHeight * 16);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className={`fixed inset-0 flex items-center justify-center overflow-hidden ${boxed ? "bg-ink" : ""}`}>
      <div className="shrink-0" style={{ zoom: scale }}>
        {children}
      </div>
    </div>
  );
}
