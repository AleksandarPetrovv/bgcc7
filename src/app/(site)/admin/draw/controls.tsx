"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Redo2, Undo2 } from "lucide-react";
import type { DrawFeed } from "@/lib/draw";
import type { ActionResult } from "@/lib/action-result";
import { errorText } from "@/lib/action-result";
import { DrawLive } from "@/components/site/draw/draw-live";
import { useDict } from "@/components/site/lang";
import { useFormat } from "@/components/site/tournament";
import { Btn } from "@/components/admin/form";
import { SlantButton } from "@/components/site/slant";
import { bracket, end, finish, last, redo, reveal, spin, undo } from "./actions";
import { DrawThanks } from "@/app/draw/thanks";
import { nextWheel, onWheel } from "@/lib/draw";

export function DrawControls({ initial, closed }: { initial: DrawFeed; closed: React.ReactNode }) {
  const t = useDict();
  const { teams } = useFormat();
  const [feed, setFeed] = useState(initial);
  const [idle, setIdle] = useState(true);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const done = feed.pairs.filter((p) => p.b !== null).length;
  const full = done === teams;
  const busy = pending || !idle;
  // one player left on the wheel that is up: no spin, the button places the last team
  const nw = nextWheel(feed.pairs);
  const lastTeam = !full && onWheel(nw === "a" ? feed.a : feed.b, feed.pairs, feed.taken).length === 1;
  const b = feed.bracket;
  const slots = b ? 2 * b.r1.length : 0;
  const act = (fn: () => Promise<ActionResult>) => () =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r?.ok) setError(errorText(t, r?.error));
    });

  // one wrapper: the admin template animates its direct children as a whole, which would swallow these intros
  return (
    <div className="[--s:0.07s]">
      {feed.open && (
        <div className="mb-8 flex flex-wrap items-center gap-3 [--d:0.15s]">
          <span className="in-left [--i:0]">
            {/* each click shows the next step: the teams, the bracket, the round of 16 one team at a time, then End closes the show */}
            <SlantButton onClick={act(b ? (b.shown >= slots ? finish : reveal) : feed.ended ? bracket : full ? end : lastTeam ? last : spin)} disabled={busy || feed.thanks} className="min-w-[9rem] justify-center px-8 py-3 text-lg" fill="shadow-[4px_4px_0_0_var(--rose-deep)]">
              {b ? (b.shown >= slots ? t.admin.wheel.finish : t.admin.wheel.reveal(Math.floor(b.shown / 2) + 1, (b.shown % 2) + 1)) : feed.ended ? t.admin.wheel.bracket : full ? t.admin.wheel.end : lastTeam ? t.wheel.team(teams) : t.admin.wheel.spin}
            </SlantButton>
          </span>
          <span className="in-left [--i:1]">
            <Btn tone="outline" onClick={act(undo)} disabled={busy || !feed.pairs.length}>
              <Undo2 className="size-4" aria-hidden />
              {t.admin.wheel.undo}
            </Btn>
          </span>
          <span className="in-left [--i:2]">
            <Btn tone="outline" onClick={act(redo)} disabled={busy || !feed.redo}>
              <Redo2 className="size-4" aria-hidden />
              {t.admin.wheel.redo}
            </Btn>
          </span>
          {error && <span className="in-up text-sm font-display font-bold text-rose-hi [--d:0s]">{error}</span>}
          <a href="/draw" target="_blank" rel="noreferrer" className="in-right ml-auto inline-flex items-center gap-1.5 text-sm font-display font-bold text-ash transition-colors hover:text-paper [--i:3]">
            {t.admin.wheel.stream} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      )}
      {/* the stage's own top-to-bottom intro starts once the controls are in */}
      <div className="[--draw-d:0.4s]">
        <DrawLive initial={initial} closed={closed} admin thanks={<DrawThanks inline />} onFeed={setFeed} onIdle={setIdle} />
      </div>
    </div>
  );
}
