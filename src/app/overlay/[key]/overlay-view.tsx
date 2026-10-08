"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { OverlayFeed } from "@/lib/overlay-types";
import type { Scene } from "@/lib/scenes";
import { CalmScene } from "./calm-scenes";
import { MappoolScene } from "./mappool-scene";
import { GameplayScene } from "./gameplay-scene";
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
    source.onmessage = (event) => {
      if (!active || event.currentTarget !== source) return;
      try {
        const next: OverlayFeed | null = JSON.parse(event.data);
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

  return (
    <div className={styles.stage}>
      {feed && (
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={`${feed.match.id}:${feed.scene}`}
            className={styles.scene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            {feed.scene === "gameplay" ? <GameplayScene feed={feed} /> : feed.scene === "mappool" ? <MappoolScene feed={feed} /> : <CalmScene feed={feed} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
