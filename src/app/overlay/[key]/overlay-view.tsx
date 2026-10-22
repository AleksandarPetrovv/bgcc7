"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionGlobalConfig, useReducedMotion } from "motion/react";
import type { OverlayFeed } from "@/lib/overlay-types";
import type { Scene } from "@/lib/scenes";
import { CalmScene } from "./calm-scenes";
import { MappoolScene } from "./mappool-scene";
import { GameplayScene } from "./gameplay-scene";
import { BracketScene, ScheduleScene } from "./schedule-scenes";
import styles from "./overlay-view.module.css";

export function OverlayView({ overlayKey, scene, stage }: { overlayKey: string; scene?: Scene; stage?: string }) {
  const q = new URLSearchParams();
  if (overlayKey === "demo" && scene) q.set("scene", scene);
  if (overlayKey === "demo" && stage) q.set("stage", stage);
  const query = q.size ? `?${q}` : "";
  const url = `/api/overlay/${encodeURIComponent(overlayKey)}${query}`;

  return <OverlaySubscription key={JSON.stringify([overlayKey, scene, stage])} url={url} />;
}

function OverlaySubscription({ url }: { url: string }) {
  const [feed, setFeed] = useState<OverlayFeed | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const source = new EventSource(url);
    let active = true;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let build: string | undefined;
    source.onmessage = (event) => {
      if (!active || event.currentTarget !== source) return;
      try {
        const next: OverlayFeed | null = JSON.parse(event.data);
        if (next?.build) {
          if (build && build !== next.build) return window.location.reload();
          build = next.build;
        }
        clearTimeout(expiry);
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
        expiry = setTimeout(() => {
          if (!active) return;
          setFeed((current) => current === next ? { ...current, live: null } : current);
        }, remaining);
      } catch {
        // keep the last complete feed while the stream reconnects.
      }
    };
    return () => {
      active = false;
      clearTimeout(expiry);
      source.close();
    };
  }, [url]);

  // a hidden tab doesn't save up animations: whatever changed while away just shows when you come back
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
  useEffect(() => {
    if (target === shown) return;
    if (shown === null || target === null || reducedMotion || document.hidden) {
      const id = setTimeout(() => setShown(target), 0);
      return () => clearTimeout(id);
    }
    const start = setTimeout(() => setWipe((w) => w + 1), 0);
    const swap = setTimeout(() => setShown(target), 520);
    return () => {
      clearTimeout(start);
      clearTimeout(swap);
    };
  }, [target, shown, reducedMotion]);

  const scene = (shown?.slice(shown.lastIndexOf(":") + 1) ?? feed?.scene) as OverlayFeed["scene"];
  const view = feed && shown ? { ...feed, scene } : null;

  return (
    <Fit>
    <div className={styles.stage}>
      {view && (
        <div key={shown} className={styles.scene}>
          {scene === "gameplay" ? <GameplayScene feed={view} /> : scene === "mappool" ? <MappoolScene feed={view} /> : scene === "schedule" ? <ScheduleScene feed={view} /> : scene === "bracket" ? <BracketScene feed={view} /> : <CalmScene feed={view} />}
        </div>
      )}
      <AnimatePresence>{wipe > 0 && <Wipe key={wipe} />}</AnimatePresence>
    </div>
    </Fit>
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
          transition={{ duration: 1.05, delay: s.d, ease: [0.76, 0, 0.24, 1] }}
        />
      ))}
    </motion.div>
  );
}

function Fit({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [boxed, setBoxed] = useState(false);
  useEffect(() => {
    const fit = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
      setBoxed(Math.abs(window.innerWidth / window.innerHeight - 16 / 9) > 0.01);
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
