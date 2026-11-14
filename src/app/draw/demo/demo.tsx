"use client";

import { useEffect, useRef, useState } from "react";
import { addPick, EMPTY_DRAW, nextWheel, onWheel, type DrawFeed, type DrawPlayer, type DrawState } from "@/lib/draw";
import { DrawStage } from "@/components/site/draw/draw-stage";
import { DemoBar } from "@/components/site/demo-bar";
import { useFormat } from "@/components/site/tournament";
import { DrawThanks } from "../thanks";

// real osu! players so the demo looks like a draw; nothing here is saved
const A: [number, string][] = [
  [7562902, "mrekk"], [9269034, "Akolibed"], [11367222, "lifeline"], [6447454, "aetrna"], [4787150, "Vaxei"], [4504101, "WhiteCat"], [124493, "chocomint"], [4650315, "idke"],
  [2558286, "Rafis"], [8179335, "Micca"], [6170507, "_yu68"], [10549880, "NINERIK"], [12408961, "MALISZEWSKI"], [13817114, "Railgun_"], [9426712, "browiec"], [7464885, "Cixia"],
];
const B: [number, string][] = [
  [11785668, "lebtunXD"], [14715160, "cryshina"], [3533958, "fieryrage"], [5182050, "Bubbleman"], [50265, "hvick225"], [39828, "WubWoofWolf"], [2746956, "Prince Railgun"], [5795337, "TheShadowOfDark"],
  [8301957, "_gt"], [6304246, "puppy"], [1777162, "firebat92"], [3172980, "xasuma"], [7082050, "Chau2JZ"], [4908650, "im a fancy lad"], [873961, "Skystar"], [1023489, "respektive"],
];
const seat = (list: [number, string][], from: number): DrawPlayer[] => list.map(([id, name], i) => ({ id, name, avatar: `https://a.ppy.sh/${id}`, seed: from + i }));
const PA = seat(A, 1);
const PB = seat(B, 17);
const seedOf = (id: number) => [...PA, ...PB].find((p) => p.id === id)?.seed ?? 99;
const GAP_MS = 1200;
// the first and last few teams (and bracket slots) play at normal speed, the middle runs this many times faster (spins faster still)
const FAST = 10;
const FAST_SPINS = 30;
const SLOW_TEAMS = 3;
const SLOW_SLOTS = 2;
const END_MS = 2000;
const TEAMS_MS = 10000;
const REVEAL_MS = 1100;
const THANKS_AFTER_MS = 4000;
const RESTART_MS = 10000;
// shortcut: how long the stage plays one pick, measured on /draw/demo (2026-11-14). only the demo bar's times lean on it: the run
// still waits for the stage to go idle before the next pick. re-measure if the stage's timings change
const playMs = (w: "a" | "b", pace: number, first: boolean, both: boolean) => (both ? 3220 : pace > 1 ? (w === "a" ? 305 : 335) : w === "b" ? 9720 : first ? 7530 : 8520);

const feedOf = (s: DrawState): DrawFeed => ({ open: true, a: PA, b: PB, taken: [], pairs: s.pairs.map(({ a, b }) => ({ a, b })), seq: s.seq, last: s.last, redo: false, ended: false, seeds: null, bracket: null, thanks: false, build: "" });

// read in handlers and timers only, never during render
const now = () => performance.now();

/** one moment of the run: from `at` ms the stage shows `feed`; a `pick` waits for the stage to finish the one before */
type Beat = { at: number; feed: DrawFeed; speed: number; pick: boolean };
type Run = { beats: Beat[]; len: number };

/** a whole demo run laid out in time: random picks like a real draw, then End, the bracket reveal and "thanks for watching" */
function plan(r1: [number, number][]): Run {
  let s = EMPTY_DRAW;
  let t = 0;
  const beats: Beat[] = [{ at: 0, feed: feedOf(s), speed: 1, pick: false }];
  for (;;) {
    const w = nextWheel(s.pairs);
    const pool = onWheel(w === "a" ? PA : PB, s.pairs, []);
    if (!pool.length) break;
    // the team this spin works on (a tier B spin finishes the one in the box)
    const team = w === "a" ? s.pairs.length + 1 : s.pairs.length;
    const pace = team <= SLOW_TEAMS || team > PA.length - SLOW_TEAMS ? 1 : FAST_SPINS;
    t += (s.seq ? GAP_MS : GAP_MS * 2) / pace;
    const first = !s.seq;
    let both = false;
    // like the admin's last-team button: one player left on each wheel, both are placed at once
    if (pool.length === 1 && w === "a") {
      const b = onWheel(PB, s.pairs, []);
      const withA = addPick(s, { w, id: pool[0].id }, "spin");
      both = b.length === 1;
      s = both ? addPick(withA, { w: "b", id: b[0].id }, "spin") : withA;
    } else s = addPick(s, { w, id: pool[Math.floor(Math.random() * pool.length)].id }, "spin");
    beats.push({ at: t, feed: feedOf(s), speed: pace, pick: true });
    t += playMs(w, pace, first, both);
  }
  // the demo ends like a real draw: End shows the final teams, then the bracket opens and fills one team at a time,
  // seeded like the real one (average seed of the pair), then the overlay's "thanks for watching" and a new run
  const done = feedOf(s);
  const seeds = s.pairs.map((p, pair) => ({ pair, avg: (seedOf(p.a) + seedOf(p.b!)) / 2, best: Math.min(seedOf(p.a), seedOf(p.b!)) })).sort((x, y) => x.avg - y.avg || x.best - y.best);
  const ended: DrawFeed = { ...done, ended: true, seeds: seeds.map(({ pair, avg }) => ({ pair, avg })), seq: done.seq + 1, last: null };
  t += END_MS;
  beats.push({ at: t, feed: ended, speed: 1, pick: false });
  const slots: [number, number][] = r1.map(([s1, s2]) => [seeds[s1 - 1].pair, seeds[s2 - 1].pair]);
  const total = 2 * slots.length;
  t += TEAMS_MS;
  for (let shown = 0; shown <= total; shown++) {
    beats.push({ at: t, feed: { ...ended, seq: ended.seq + 1 + shown, bracket: { shown, r1: slots } }, speed: 1, pick: false });
    if (shown < total) t += shown < SLOW_SLOTS || shown >= total - SLOW_SLOTS ? REVEAL_MS : REVEAL_MS / FAST;
  }
  t += THANKS_AFTER_MS;
  const full = beats.at(-1)!.feed;
  beats.push({ at: t, feed: { ...full, seq: full.seq + 1, thanks: true }, speed: 1, pick: false });
  return { beats, len: t + RESTART_MS };
}

export function DrawDemo() {
  const { r1 } = useFormat();
  const [first] = useState(() => plan(r1));
  const run = useRef(first);
  // `mount`: a seek or a new run remounts the stage, so it shows that spot at once instead of playing out what it has queued
  const [view, setView] = useState({ beat: first.beats[0], len: first.len, mount: 0 });
  const [t, setT] = useState(0);
  const origin = useRef(0);
  const idle = useRef(true);
  const waiting = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // the demo clock; while a pick waits for the stage, it waits too
  const clock = () => Math.min(run.current.len, waiting.current != null ? run.current.beats[waiting.current].at : now() - origin.current);
  // `still`: the stage was just remounted on this beat, so it shows it without playing anything
  const apply = (i: number, still = false) => {
    waiting.current = null;
    const beat = run.current.beats[i];
    if (beat.pick && !still) idle.current = false;
    setView((v) => ({ ...v, beat, len: run.current.len }));
    schedule(i + 1);
  };
  const schedule = (i: number) => {
    clearTimeout(timer.current);
    const { beats, len } = run.current;
    timer.current = setTimeout(
      () => {
        if (i >= beats.length) return jump(0, plan(r1));
        if (beats[i].pick && !idle.current) waiting.current = i;
        else apply(i);
      },
      Math.max(0, (i < beats.length ? beats[i].at : len) - (now() - origin.current)),
    );
  };
  const jump = (ms: number, next?: Run) => {
    if (next) run.current = next;
    origin.current = now() - ms;
    idle.current = true;
    setView((v) => ({ ...v, mount: v.mount + 1 }));
    apply(run.current.beats.findLastIndex((b) => b.at <= ms), true);
  };
  const onIdle = (v: boolean) => {
    idle.current = v;
    const w = waiting.current;
    if (!v || w == null) return;
    origin.current = now() - run.current.beats[w].at;
    apply(w);
  };

  useEffect(() => {
    origin.current = now();
    schedule(1);
    const bar = setInterval(() => setT(clock()), 100);
    return () => {
      clearTimeout(timer.current);
      clearInterval(bar);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <DrawStage key={view.mount} feed={view.beat.feed} onIdle={onIdle} wordmark speed={view.beat.speed} thanks={<DrawThanks />} />
      <DemoBar t={t} len={view.len} onSeek={(ms) => jump(ms)} />
    </>
  );
}
