"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { SCENES, type Scene } from "@/lib/scenes";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/ease";
import { SlantBg } from "@/components/site/slant";
import { setBracketZoom, setScene } from "./actions";
import { usePanelFeed } from "./overlay-preview";

// buttons slide by position only (no scale), so their text never sits in a scaled layer
const SLIDE = { layout: { duration: 0.35, ease: EASE }, opacity: { duration: 0.25, ease: EASE } };

export function SceneButtons({ id, initial }: { id: string; initial: Scene | null }) {
  const t = useDict();
  const [scene, setLocal] = useState<Scene | null>(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const feed = usePanelFeed();
  // a click waits for the overlay's answer; until then the toggle stays locked
  const [asked, setAsked] = useState<boolean | null>(null);
  const zoom = feed?.match.id === id ? feed.zoom : null;
  if (asked !== null && (!zoom || zoom.on === asked)) setAsked(null);
  const shownZoom = zoom && asked !== null ? { on: asked, settled: false } : zoom;

  const pick = (next: Scene | null) => {
    const prev = scene;
    setLocal(next);
    setErr(false);
    start(async () => {
      const res = await setScene(id, next);
      if (!res?.ok) {
        setLocal(prev);
        setErr(true);
      }
    });
  };
  const toggleZoom = () => {
    if (!shownZoom?.settled) return;
    const next = !shownZoom.on;
    setAsked(next);
    setErr(false);
    start(async () => {
      const res = await setBracketZoom(id, next);
      if (!res?.ok) {
        setAsked(null);
        setErr(true);
      }
    });
  };
  // the label names what a click does; mid-animation it keeps the old one
  const zoomedLabel = shownZoom ? (shownZoom.settled ? shownZoom.on : !shownZoom.on) : false;
  const opts: (Scene | null)[] = [null, ...SCENES];
  return (
    <div className="relative flex flex-wrap gap-2" aria-busy={pending}>
      <AnimatePresence mode="popLayout" initial={false}>
        {opts.flatMap((s) => {
          const on = scene === s;
          const button = (
            <motion.button
              layout="position"
              transition={SLIDE}
              key={s ?? "auto"}
              type="button"
              onClick={() => !on && pick(s)}
              aria-pressed={on}
              className={cn(
                "group/sc relative isolate inline-flex min-h-9 items-center px-3 text-xs font-display font-bold transition-colors",
                on ? (s === null ? "text-on-fill" : "text-white") : "text-ash hover:text-paper",
              )}
            >
              <SlantBg className={cn("border transition-colors", on ? (s === null ? "border-balkan bg-balkan" : "border-rose bg-rose") : "border-line group-hover/sc:border-paper")} />
              {t.admin.stream.scenes[s ?? "auto"]}
            </motion.button>
          );
          if (s !== null || !shownZoom) return [button];
          const Icon = zoomedLabel ? ZoomOut : ZoomIn;
          return [
            button,
            <motion.button
              layout="position"
              key="zoom"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SLIDE}
              onClick={toggleZoom}
              disabled={!shownZoom.settled}
              aria-pressed={zoomedLabel}
              className="group/zm relative isolate inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-display font-bold text-rose-hi transition-colors hover:text-paper disabled:cursor-wait disabled:opacity-60"
            >
              <SlantBg className="border border-rose/70 bg-rose/10 shadow-[3px_3px_0_0_var(--rose-deep)] transition-colors group-hover/zm:border-rose group-disabled/zm:group-hover/zm:border-rose/70" />
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {zoomedLabel ? t.admin.stream.zoomOut : t.admin.stream.zoomIn}
            </motion.button>,
          ];
        })}
      </AnimatePresence>
      {err && <span className="self-center text-xs font-display font-bold text-rose-hi">{t.admin.stream.failed}</span>}
    </div>
  );
}
