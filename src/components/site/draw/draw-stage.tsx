"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { drawDone, nextWheel, onWheel, type DrawFeed, type DrawPlayer, type DrawWheel } from "@/lib/draw";
import { useDict } from "@/components/site/lang";
import { useFormat } from "@/components/site/tournament";
import { Pfp } from "@/components/site/pfp";
import { SlantBg } from "@/components/site/slant";
import { Wordmark } from "@/components/site/graphics";
import { cn } from "@/lib/utils";
import { Wheel, type Tone } from "./wheel";
import { DrawFinale } from "./finale";
import { DrawBracket } from "./draw-bracket";
import { Letters } from "@/components/site/rich";
import { EASE } from "@/lib/ease";

const FLY_MS = 850;
// flights ease in and out: the house ease-out shot them off the wheel too fast
const FLY_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
// a finished pair glows gold this long; it then waits in the box until the next spin (or End) sends it to the board
const HOLD_MS = 2200;
// a player taken back out of the middle (undo) fades out this long before the new state shows
const LEAVE_MS = 450;
const NAME_OUT_MS = 250;
// the last team skips the wheels: captain, then partner pop into the box this far apart
const ENTER_GAP = 0.7;
const ENTER_FADE_MS = 950;
const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";
const ENTER_MS = 2200;
// after End the final screen comes up as soon as the last pair has landed on the board
const FINALE_WAIT_MS = 0;
const AFTER_MS = 800;

// --draw-d lets a host page start the whole intro later (admin plays its controls first)
const at = (i: number, d = 0.1, s = 0.07) =>
  ({
    "--i": i,
    "--d": `calc(var(--draw-d, 0s) + ${d}s)`,
    "--s": `${s}s`,
  }) as React.CSSProperties;

/**
 * the draw as viewers see it. it plays every new spin it is handed, one after another, before showing the next state;
 * anything else (undo, redo, a refresh) just moves the players to where they now are. `onIdle` says when nothing is playing.
 */
export function DrawStage({
  feed,
  onIdle,
  wordmark,
  admin,
  thanks,
  speed = 1,
}: {
  feed: DrawFeed;
  onIdle?: (idle: boolean) => void;
  wordmark?: boolean;
  /** the host's page: a narrower column, so the board stays 4 wide, and the teams and bracket stay small views in the page */
  admin?: boolean;
  /** the closing screen once the host ends the show (the overlay's "thanks for watching") */
  thanks?: React.ReactNode;
  /** plays spins, flights and holds this many times faster (the demo skips through the middle of the draw) */
  speed?: number;
}) {
  const t = useDict();
  const { teams } = useFormat();
  const [shown, setShown] = useState(feed);
  const [spin, setSpin] = useState<{
    w: DrawWheel;
    id: number;
    key: number;
  } | null>(null);
  const [hold, setHold] = useState(false);
  // the last finished pair has left the box for the board
  const [flushed, setFlushed] = useState(() => feed.ended);
  const [finale, setFinale] = useState(() => feed.ended);
  // players that pop into the box instead of flying from a wheel (the last team), in order
  const [enter, setEnter] = useState<number[]>([]);
  const flushedRef = useRef(flushed);
  const root = useRef<HTMLDivElement>(null);
  const flights = useRef<Map<number, DOMRect> | null>(null);
  // players that fade in where they stand (the last team has no wheel to fly from): id → delay in s
  const pops = useRef<Map<number, number> | null>(null);
  const [live, setLive] = useState<Record<DrawWheel, DrawPlayer | null>>({
    a: null,
    b: null,
  });
  const queue = useRef<DrawFeed[]>([]);
  const busy = useRef(false);
  const cur = useRef(feed);
  const next = useRef<DrawFeed | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idle = useRef(onIdle);
  useEffect(() => {
    idle.current = onIdle;
  });
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const pace = useRef(speed);
  useEffect(() => {
    pace.current = speed;
  });
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms / pace.current));

  const show = (f: DrawFeed) => {
    cur.current = f;
    setShown(f);
  };
  const flush = (v: boolean) => {
    flushedRef.current = v;
    setFlushed(v);
  };

  // flights by hand (measure, re-render, animate from the old spot) so lite and full motion play the same
  const takeOff = (ids: number[]) => {
    const m = new Map<number, DOMRect>();
    for (const id of ids) {
      const el = root.current?.querySelector(`[data-fly="${id}"]`);
      if (el) m.set(id, el.getBoundingClientRect());
    }
    flights.current = m;
  };
  useLayoutEffect(() => {
    const p = pops.current;
    pops.current = null;
    for (const [id, delay] of p ?? []) {
      root.current?.querySelector<HTMLElement>(`[data-fly="${id}"]`)?.animate(
        [
          { opacity: 0, transform: "translateY(12px) scale(0.8)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: ENTER_FADE_MS / pace.current, delay: (delay * 1000) / pace.current, easing: EASE_CSS, fill: "backwards" },
      );
    }
    const m = flights.current;
    flights.current = null;
    if (m) land(m, 0);
  });

  // a player flying back to a wheel only gets its spot there a frame or two later, so a missing target is retried
  const land = (m: Map<number, DOMRect>, tries: number) => {
    const late = new Map<number, DOMRect>();
    for (const [id, from] of m) {
      const el = root.current?.querySelector<HTMLElement>(`[data-fly="${id}"]`);
      const to = el?.getBoundingClientRect();
      if (!el || !to?.width) {
        late.set(id, from);
        continue;
      }
      // keeps its own stacking on top of the lift, so the board's captain is over the partner for the whole flight, not only once landed
      const z = 30 + (Number(getComputedStyle(el).zIndex) || 0);
      el.animate(
        [
          {
            transformOrigin: "0 0",
            transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`,
            zIndex: z,
          },
          { transformOrigin: "0 0", transform: "none", zIndex: z },
        ],
        { duration: FLY_MS / pace.current, easing: FLY_EASE },
      );
      // board cells are their own stacking contexts, so the landing cell rises above its neighbours for the flight
      el.closest("li")?.animate([{ zIndex: 30 }, { zIndex: 30 }], {
        duration: FLY_MS / pace.current,
      });
    }
    if (late.size && tries < 6) requestAnimationFrame(() => land(late, tries + 1));
  };

  const done = () => {
    busy.current = false;
    pump();
  };

  const pump = useCallback(() => {
    if (busy.current) return;
    for (let f = queue.current.shift(); f; f = queue.current.shift()) {
      const op = f.last?.op;
      const was = cur.current;
      const step = f.seq - was.seq;
      // a wheel with one player left is not spun: whoever is left pops into the box one by one
      const single = op && onWheel(op.w === "a" ? f.a : f.b, was.pairs, was.taken).length === 1;
      if (f.last?.kind === "spin" && op && (step === 2 || (step === 1 && single))) {
        busy.current = true;
        idle.current?.(false);
        const before = new Set(was.pairs.flatMap((p) => [p.a, p.b]));
        const pair = f.pairs.at(-1)!;
        const fresh = [pair.a, pair.b].filter((id): id is number => id !== null && !before.has(id));
        const enterNow = () => {
          setEnter(fresh);
          pops.current = new Map(fresh.map((id, k) => [id, 0.15 + k * ENTER_GAP]));
          show(f);
          flush(false);
          later(ENTER_MS, done);
        };
        // the pair still waiting in the box goes down to the board first
        const parked = was.pairs.at(-1);
        if (parked && parked.b !== null && !flushedRef.current) {
          takeOff([parked.a, parked.b]);
          flush(true);
          later(FLY_MS + 150, enterNow);
        } else enterNow();
        return;
      }
      if (f.ended && !was.ended) {
        // End: the last pair flies down to the board first, the final screen follows
        busy.current = true;
        idle.current?.(false);
        const last = was.pairs.at(-1);
        if (last && last.b !== null && !flushedRef.current) takeOff([last.a, last.b]);
        flush(true);
        show(f);
        later(FLY_MS + FINALE_WAIT_MS, () => {
          setFinale(true);
          done();
        });
        return;
      }
      if (!f.ended) setFinale(false);
      // undo from the final teams: the last pair is back in the middle, where it was before End
      if (!f.ended && was.ended) flush(false);
      if (step === 1 && f.last?.kind === "spin" && op) {
        busy.current = true;
        idle.current?.(false);
        next.current = f;
        setLive((l) => ({ ...l, [op.w]: null }));
        const go = () => setSpin({ w: op.w, id: op.id, key: f.seq });
        const last = cur.current.pairs.at(-1);
        // the pair still waiting in the box flies to the board first, then the wheel turns
        if (last && last.b !== null && !flushedRef.current) {
          takeOff([last.a, last.b]);
          flush(true);
          later(FLY_MS + 150, go);
        } else go();
        return;
      }
      // players taken back out of the middle fade out first
      const inBox = (x: DrawFeed) => {
        const l = x.pairs.at(-1);
        return !l ? [] : l.b === null ? [l.a] : flushedRef.current ? [] : [l.a, l.b];
      };
      const leftBefore = inBox(was);
      // a whole pair taken back: the finished pair before it goes back up into the middle, where it waited before that spin
      const back = f.pairs.length < was.pairs.length ? f.pairs.at(-1) : undefined;
      const backUp = back && back.b !== null ? [back.a, back.b] : [];
      if (backUp.length) flush(false);
      const keep = new Set(inBox(f));
      const leaving = leftBefore.filter((id) => !keep.has(id));
      if (leaving.length && !f.ended) {
        busy.current = true;
        idle.current?.(false);
        // back onto a wheel that is still shown: the pfp flies home after its name fades; onto a hidden one (the last team) it just fades
        const home = (id: number) => {
          const tier = f.a.some((p) => p.id === id) ? f.a : f.b;
          return onWheel(tier, f.pairs, f.taken).length > 1;
        };
        const flyBack = leaving.filter(home);
        const fade = leaving.filter((id) => !home(id));
        for (const id of flyBack) root.current?.querySelectorAll(`[data-name="${id}"]`).forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: NAME_OUT_MS, easing: EASE_CSS, fill: "forwards" }));
        if (!fade.length) {
          later(NAME_OUT_MS, () => {
            takeOff([...flyBack, ...backUp]);
            show(f);
            later(FLY_MS, done);
          });
          return;
        }
        for (const id of fade)
          root.current?.querySelectorAll(`[data-fly="${id}"], [data-name="${id}"]`).forEach((el) =>
            el.animate(
              [
                { opacity: 1, transform: "none" },
                { opacity: 0, transform: "translateY(8px) scale(0.85)" },
              ],
              { duration: LEAVE_MS, easing: EASE_CSS, fill: "forwards" },
            ),
          );
        later(LEAVE_MS, () => {
          takeOff([...flyBack, ...backUp]);
          show(f);
          later(flyBack.length || backUp.length ? FLY_MS : 0, done);
        });
        return;
      }
      show(f);
    }
    idle.current?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (feed === cur.current) return;
    queue.current.push(feed);
    pump();
  }, [feed, pump]);

  const landed = () => {
    const f = next.current!;
    const w = spin!.w;
    takeOff([spin!.id]);
    setSpin(null);
    show(f);
    setEnter([]);
    if (w === "b") flush(false);
    if (w === "b") {
      setHold(true);
      later(HOLD_MS, () => {
        setHold(false);
        later(AFTER_MS, done);
      });
    } else later(AFTER_MS, done);
  };

  const s = shown;
  const n = teams;
  if (s.a.length + s.b.length < 2 * n) return <DrawNote>{t.wheel.short(2 * n)}</DrawNote>;
  const byId = new Map([...s.a, ...s.b].map((p) => [p.id, p]));
  const lastPair = s.pairs.at(-1);
  const box = lastPair && (lastPair.b === null || !flushed) ? lastPair : null;
  const board = s.pairs.filter((p) => p.b !== null && p !== box);
  const turn = s.pairs.filter((p) => p.b !== null).length === n ? null : nextWheel(s.pairs);
  const started = s.pairs.length > 0 || !!spin;
  const teamNo = box ? s.pairs.indexOf(box) + 1 : Math.min(board.length + 1, n);
  const wheels: {
    w: DrawWheel;
    tone: Tone;
    players: DrawPlayer[];
    from: number;
  }[] = [
    { w: "a", tone: "rose", players: onWheel(s.a, s.pairs, s.taken), from: 1 },
    {
      w: "b",
      tone: "balkan",
      players: onWheel(s.b, s.pairs, s.taken),
      from: n + 1,
    },
  ];
  const wheel = (k: 0 | 1) => {
    const { w, tone, players, from } = wheels[k];
    const name = live[w];
    return (
      <div className={cn("flex min-w-0 flex-col items-center gap-2 transition-[opacity,transform] duration-700 ease-[var(--ease)] @3xl:gap-4", players.length <= 1 && "pointer-events-none scale-90 opacity-0")} aria-hidden={players.length <= 1}>
        <div className="in-up text-center" style={at(1 + k)}>
          <div className={cn("text-base font-display font-black @3xl:text-xl", tone === "rose" ? "text-rose-hi" : "text-balkan-hi")}>{t.wheel.tier[w]}</div>
          <div className="num text-xs text-ash">{t.wheel.seeds(from, from + n - 1)}</div>
        </div>
        <div className="in-pop w-[70%] max-w-[min(19rem,31vh)] pt-[5%]" style={at(3 + k)}>
          <Wheel players={players} tone={tone} speed={speed} spin={spin?.w === w ? spin : null} dim={!!turn && turn !== w} onLanded={landed} onLive={(p) => setLive((l) => ({ ...l, [w]: p }))} empty={t.wheel.empty} hub={w.toUpperCase()} />
        </div>
        <div className="in-up flex h-7 max-w-full items-center justify-center @3xl:h-8" style={at(5 + k)}>
          {name && spin?.w === w ? <span className="truncate text-base font-display font-black text-paper @3xl:text-2xl">{name.name}</span> : null}
        </div>
      </div>
    );
  };

  const slot = (p: DrawPlayer | undefined, role: "captain" | "partner", i: number) => {
    const k = p ? enter.indexOf(p.id) : -1;
    const delay = k < 0 ? 0 : 0.15 + k * ENTER_GAP;
    return (
      <div className="in-pop flex min-w-0 flex-1 flex-col items-center gap-2" style={{ "--i": i } as React.CSSProperties}>
        <div className="relative size-24 sm:size-32">
          <span className={cn("absolute inset-0 rounded-full border-2 border-dashed transition-colors duration-700 ease-[var(--ease)]", hold ? "border-gold" : role === "captain" ? "border-rose/40" : "border-balkan/50")} />
          {p && (
            <div data-fly={p.id} className="absolute inset-0">
              <Pfp src={p.avatar} className="size-full shadow-[0_0_0_3px_var(--paper)]" />
            </div>
          )}
        </div>
        <span className={cn("text-xs font-display font-bold sm:text-sm", role === "captain" ? "text-rose-hi" : "text-balkan-hi")}>{t.wheel[role]}</span>
        <span className="flex h-6 w-full min-w-0 items-center justify-center">
          {p && (
            <span data-name={p.id} className="flex min-w-0 max-w-full items-center">
              {/* typed in while the pfp travels (or pops in, for the last team) */}
              <Letters key={p.id} text={p.name} plain d={k < 0 ? 0.1 : delay + 0.3} s={Math.min(0.045, 0.6 / Math.max(p.name.length, 1))} className="min-w-0 truncate text-base font-display font-black sm:text-lg" />
            </span>
          )}
        </span>
      </div>
    );
  };

  // by pair index, like the bracket's slots
  const pairTeams = s.pairs.flatMap((p) => {
    const a = byId.get(p.a);
    const b = p.b === null ? undefined : byId.get(p.b);
    return a && b ? [{ a, b }] : [];
  });
  const final = finale && s.ended;
  const seeded = s.seeds?.map(({ pair, avg }) => ({ ...pairTeams[pair], avg })) ?? pairTeams;

  const bracket = final ? s.bracket : null;
  const closing = final && s.thanks && !!thanks;
  const bracketView = (cover?: boolean) => bracket && <DrawBracket key="bracket" teams={pairTeams} r1={bracket.r1} shown={bracket.shown} cover={cover} />;

  return (
    <>
      {/* viewers: the bracket opens full screen over the teams */}
      {!admin && <AnimatePresence>{bracketView(true)}</AnimatePresence>}
      {!admin && (
        <AnimatePresence>
          {closing && (
            <motion.div key="thanks" className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
              {thanks}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <AnimatePresence mode="wait" initial={false}>
      {admin && closing ? (
        <motion.div key="thanks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          {thanks}
        </motion.div>
      ) : admin && bracket ? (
        bracketView()
      ) : final ? (
        <DrawFinale key="finale" teams={seeded} compact={admin} />
      ) : (
        <motion.div key="stage" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <div ref={root} className="@container w-full">
            <header className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-3 @3xl:mb-8">
              {wordmark && (
                <span className="in-drop" style={at(0, 0.05)}>
                  <Wordmark size="md" className="text-paper" />
                </span>
              )}
              <h1 className="heading-slam in-wipe text-3xl @3xl:text-4xl" style={at(0, 0.15)}>
                {t.wheel.title}
              </h1>
              <div className="in-right ml-auto flex items-center gap-4" style={at(0, 0.3)}>
                <span className="relative isolate px-3.5 py-1.5 text-sm font-display font-bold text-white">
                  <SlantBg className={cn("transition-colors duration-500", turn === "a" ? "bg-rose" : turn === "b" ? "bg-balkan-deep" : "bg-gold-deep")} />
                  {t.wheel.next[turn ?? "done"]}
                </span>
                <span className="num text-2xl text-paper">
                  {teamNo}
                  <span className="text-ash">/{n}</span>
                </span>
              </div>
            </header>

            <div className="grid grid-cols-2 items-center gap-x-4 gap-y-6 @3xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @3xl:gap-6">
              {wheel(0)}
              <div className="in-up order-last col-span-2 mx-auto flex w-full max-w-md flex-col items-center gap-3 @3xl:order-none @3xl:col-span-1 @3xl:w-[28rem]" style={at(4)}>
                {/* hidden until the first spin; the new key remounts it so its intro plays right then */}
                <div key={started ? "on" : "off"} className={cn("flex w-full flex-col items-center gap-3 transition-opacity duration-700 [--d:0s] [--s:0.12s]", !started && "invisible", !box && drawDone(s.pairs, n) && "opacity-0")}>
                  <span className={cn("in-up heading-slam text-2xl transition-colors duration-700 ease-[var(--ease)] [--i:0] @3xl:text-4xl", hold && "text-gold")}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={teamNo} className="inline-block" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28, ease: EASE }}>
                        {t.wheel.team(teamNo)}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <div className="flex w-full items-start gap-3">
                    {slot(box ? byId.get(box.a) : undefined, "captain", 1)}
                    {slot(box?.b ? byId.get(box.b) : undefined, "partner", 2)}
                  </div>
                </div>
              </div>
              {wheel(1)}
            </div>

            <section className="mt-8">
              <h2 className="in-left mb-3 text-sm font-display font-bold text-ash" style={at(7)}>
                {t.wheel.teams}
              </h2>
              <ol className={cn("grid grid-cols-2 gap-x-3 gap-y-3 @3xl:grid-cols-4 @3xl:gap-x-4", admin ? "mx-auto @3xl:max-w-[90%]" : "@7xl:grid-cols-8")}>
                {Array.from({ length: n }, (_, i) => {
                  const pair = board[i];
                  const a = pair && byId.get(pair.a);
                  const b = pair?.b != null ? byId.get(pair.b) : undefined;
                  return (
                    <li key={i} className="in-up relative isolate flex h-[4.25rem] min-w-0 items-center gap-2 px-2.5 @3xl:gap-2.5 @3xl:px-4" style={at(i, 0.85, 0.03)}>
                      <SlantBg className={cn("transition-colors duration-500", a ? "border border-line bg-coal" : "border-2 border-dashed border-line/80 bg-ink/70")} />
                      {/* top right once filled: the captain's crown sits top left */}
                      <span className={cn("num absolute text-[0.65rem] text-ash", a ? "right-3 top-1" : "left-4 top-1/2 -translate-y-1/2 text-xs")}>{i + 1}</span>
                      {a && b ? (
                        <>
                          <span className="ml-1.5 flex shrink-0 @3xl:ml-2">
                            <span data-fly={a.id} className="relative z-10 size-8 rounded-full @3xl:size-9">
                              <Pfp src={a.avatar} crown className="size-full shadow-[0_0_0_2px_var(--coal)]" />
                            </span>
                            <span data-fly={b.id} className="-ml-2.5 size-8 rounded-full @3xl:size-9">
                              <Pfp src={b.avatar} className="size-full shadow-[0_0_0_2px_var(--coal)]" />
                            </span>
                          </span>
                          <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45, duration: 0.3 }} className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-[0.7rem] font-bold @3xl:text-xs">{a.name}</span>
                            <span className="truncate text-[0.7rem] text-ash @3xl:text-xs">{b.name}</span>
                          </motion.span>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}

/** a centred one-line message in place of the draw (wrong phase, too few players) */
export function DrawNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <p className="in-up relative isolate max-w-xl px-8 py-6 text-center text-lg font-display font-bold text-paper [--d:0.1s]">
        <SlantBg className="-skew-x-6 border-2 border-dashed border-line bg-coal/60" />
        {children}
      </p>
    </div>
  );
}
