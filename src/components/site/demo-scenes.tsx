"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Film } from "lucide-react";
import { EASE } from "@/lib/ease";
import { SlantBg } from "./slant";
import { Tabs } from "./tabs";

const SWAP = { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 16 }, transition: { duration: 0.35, ease: EASE } } as const;
const PANEL = "border border-line bg-ink/90 shadow-lg backdrop-blur-sm";

/** the demos' scene picker, top right: the tab shows what's playing, picking one plays it from its start; folds away to a small button */
export function DemoScenes({ options, index, onPick }: { options: string[]; index: number; onPick: (i: number) => void }) {
  const [open, setOpen] = useState(true);
  const row = useRef<HTMLDivElement>(null);
  // the tabs follow the demo; on a narrow screen the row scrolls the playing one into view
  useEffect(() => {
    const tab = row.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const box = row.current?.firstElementChild as HTMLElement | null;
    if (tab && box) box.scrollTo({ left: tab.offsetLeft - (box.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
  }, [index, open]);
  return (
    <div className="fixed right-4 top-4 z-[90] flex max-w-[calc(100vw-32px)] justify-end text-paper">
      <AnimatePresence mode="popLayout">
        {open ? (
          <motion.div key="scenes" {...SWAP} className="relative isolate flex min-w-0 items-center gap-3 py-1.5 pl-2 pr-5">
            <SlantBg className={PANEL} />
            <button type="button" onClick={() => setOpen(false)} aria-label="Hide Scenes" className="grid size-8 shrink-0 place-items-center text-ash transition-colors hover:text-paper">
              <ChevronRight className="size-5" />
            </button>
            <div ref={row} className="min-w-0">
              <Tabs options={options} index={index} onChange={onPick} label="Demo Scenes" spark className="relative flex-nowrap overflow-x-auto pt-1 [scrollbar-width:none]" />
            </div>
          </motion.div>
        ) : (
          <motion.button key="tab" type="button" {...SWAP} onClick={() => setOpen(true)} aria-label="Show Scenes" className="relative isolate grid h-12 w-14 place-items-center text-ash transition-colors hover:text-paper">
            <SlantBg className={PANEL} />
            <Film className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
