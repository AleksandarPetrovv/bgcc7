"use client";

import { useEffect, useRef, useState } from "react";
import type { OverlayFeed } from "@/lib/overlay-types";
import styles from "./overlay-preview.module.css";

export function OverlayPreview({ slug, title, label, offline, clientsLabel, delayLabel, initialAt, initialClients }: { slug: string; title: string; label: string; offline: string; clientsLabel: string; delayLabel: string; initialAt: number | null; initialClients: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<number | null>(initialAt);
  const [clients, setClients] = useState(initialClients);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const resize = () => el.style.setProperty("--preview-scale", String(el.clientWidth / 1920));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const source = new EventSource(`/api/overlay/${encodeURIComponent(slug)}`);
    source.onmessage = (event) => {
      try {
        const feed: OverlayFeed | null = JSON.parse(event.data);
        setAt(feed?.live?.at ?? null);
        setClients(feed?.live?.clients.length ?? 0);
        setNow(Date.now());
      } catch {
        // the expiry timer clears stale status during a reconnect.
      }
    };
    source.onerror = () => {};
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      source.close();
      window.clearInterval(timer);
    };
  }, [slug]);

  const live = at !== null && now - at < 10_000;
  return (
    <div className="grid gap-2">
      <div ref={box} className={styles.preview}>
        <iframe src={`/overlay/${encodeURIComponent(slug)}`} title={title} width="1920" height="1080" loading="lazy" tabIndex={-1} className={styles.frame} />
      </div>
      <span className="flex items-center gap-2 text-xs font-bold text-ash" role="status">
        <span className={`size-2 shrink-0 rotate-45 ${live ? "bg-balkan" : "bg-line"}`} aria-hidden />
        <span className={live ? "text-paper" : undefined}>{live ? label : offline}</span>
        {live && <span>{clientsLabel.replace("%count%", String(clients))} · {delayLabel.replace("%seconds%", String(Math.max(0, Math.floor((now - at) / 1000))))}</span>}
      </span>
    </div>
  );
}
