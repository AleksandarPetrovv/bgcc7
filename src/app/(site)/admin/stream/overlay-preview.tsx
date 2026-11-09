"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import type { OverlayFeed } from "@/lib/overlay-types";
import { SlantButton } from "@/components/site/slant";
import { useSSE } from "@/components/site/use-sse";
import styles from "./overlay-preview.module.css";

// one match panel shares its preview's feed stream, so the scene buttons read the overlay's state without a stream of their own
const PanelFeed = createContext<{ feed: OverlayFeed | null; set: (f: OverlayFeed | null) => void }>({ feed: null, set: () => {} });
export const usePanelFeed = () => useContext(PanelFeed).feed;
export function PanelFeedProvider({ children }: { children: React.ReactNode }) {
  const [feed, set] = useState<OverlayFeed | null>(null);
  return <PanelFeed value={{ feed, set }}>{children}</PanelFeed>;
}

export function OverlayPreview({ slug, title, view, label, offline, clientsLabel, delayLabel, initialAt, initialClients }: { slug: string; title: string; view: string; label: string; offline: string; clientsLabel: string; delayLabel: string; initialAt: number | null; initialClients: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<number | null>(initialAt);
  const [clients, setClients] = useState(initialClients);
  const [now, setNow] = useState(0);
  // each preview holds two streams (its own + the overlay's); every match at once would pass the per-ip stream cap in lib/sse.ts
  const [inView, setInView] = useState(false);
  // the overlay itself only loads on View, and unloads once scrolled away
  const [watching, setWatching] = useState(false);
  const [scale, setScale] = useState(0);
  const share = useContext(PanelFeed).set;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const seen = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (!e.isIntersecting) setWatching(false);
    }, { rootMargin: "200px 0px" });
    seen.observe(el);
    const size = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    size.observe(el);
    return () => {
      seen.disconnect();
      size.disconnect();
    };
  }, []);

  useSSE(inView ? `/api/overlay/${encodeURIComponent(slug)}` : null, (data) => {
    try {
      const feed: OverlayFeed | null = JSON.parse(data);
      share(feed);
      setAt(feed?.live?.at ?? null);
      setClients(feed?.live?.clients.length ?? 0);
      setNow(Date.now());
    } catch {
    }
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const live = at !== null && now - at < 10_000;
  return (
    <div className="grid gap-2">
      <div ref={box} className={styles.preview}>
        {/* the overlay renders at full 1920x1080 and the whole frame is shrunk as one picture (css zoom got applied twice in safari) */}
        {watching ? (
          <iframe src={`/overlay/${encodeURIComponent(slug)}`} title={title} tabIndex={-1} className={styles.frame} style={{ transform: `scale(${scale})` }} />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <SlantButton tone="outline" fill="border-rose group-hover/sk:bg-rose/10" onClick={() => setWatching(true)} className="px-5 py-2.5 text-base">
              <Eye className="size-4 text-rose-hi" aria-hidden />
              {view}
            </SlantButton>
          </div>
        )}
      </div>
      <span className="flex items-center gap-2 text-xs font-bold text-ash" role="status">
        <span className={`size-2 shrink-0 rotate-45 ${live ? "bg-balkan" : "bg-line"}`} aria-hidden />
        <span className={live ? "text-paper" : undefined}>{live ? label : offline}</span>
        {live && <span>{clientsLabel.replace("%count%", String(clients))} · {delayLabel.replace("%seconds%", String(Math.max(0, Math.floor((now - at) / 1000))))}</span>}
      </span>
    </div>
  );
}
