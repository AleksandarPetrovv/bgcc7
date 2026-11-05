import type { Dict } from "@/lib/i18n/dict";
import { fmtRange, type phaseStates, type TimelineRow } from "@/lib/dates";
import { InView } from "./in-view";
import { cn } from "@/lib/utils";

// d: when the steps start drawing
export function Timeline({ t, timeline, locale, states, d = 0.85, className }: { t: Dict; timeline: TimelineRow[]; locale: string; states: ReturnType<typeof phaseStates>; d?: number; className?: string }) {
  return (
    <InView as="ol" className={cn("relative mt-6", className)}>
      {timeline.map((e, i) => {
        const current = states[i] === "now";
        const done = states[i] === "done";
        return (
          <li
            key={e.key}
            className={cn(
              "in-left relative flex items-baseline gap-4 py-2 pl-8 pr-3 font-display font-bold text-[0.95rem] transition-colors",
              current ? "bg-slate/55 font-black text-paper" : done ? "text-ash" : "text-paper/80 hover:text-paper",
            )}
            style={{ "--d": `${d}s`, "--i": i, "--s": "0.08s" } as React.CSSProperties}
          >
            {/* the dashed line draws a piece at a time, together with its step */}
            <span className={cn("in-stitch absolute left-0 flex w-4 justify-center", i === 0 ? "top-3" : "top-0", i === timeline.length - 1 ? "bottom-3" : "bottom-0")} aria-hidden>
              <span className="border-l-2 border-dashed border-line" />
            </span>
            <span className="in-pop absolute left-0 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center" style={{ "--d": `${d + 0.15}s`, "--i": i, "--s": "0.08s" } as React.CSSProperties}>
              {current ? (
                <>
                  <span className="anim-ping-diamond absolute size-2.5 bg-rose" aria-hidden />
                  <span className="size-2.5 rotate-45 bg-rose" />
                </>
              ) : (
                <span className={cn("size-2 rotate-45", done ? "bg-ash" : "border border-paper/60 bg-ink")} />
              )}
            </span>
            <span className="flex-1">{t.timeline[e.key]}</span>
            <span className="in-wipe num whitespace-nowrap text-base normal-case" style={{ "--d": `${d + 0.25}s`, "--i": i, "--s": "0.08s" } as React.CSSProperties}>{fmtRange(locale, e.from, e.to)}</span>
          </li>
        );
      })}
    </InView>
  );
}
