"use client";

import { useEffect, useRef, useState } from "react";
import { addPick, EMPTY_DRAW, nextWheel, onWheel, type DrawFeed, type DrawPlayer, type DrawState } from "@/lib/draw";
import { DrawStage } from "@/components/site/draw/draw-stage";
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

const feedOf = (s: DrawState): DrawFeed => ({ open: true, a: PA, b: PB, taken: [], pairs: s.pairs.map(({ a, b }) => ({ a, b })), seq: s.seq, last: s.last, redo: false, ended: false, seeds: null, bracket: null, thanks: false, build: "" });

export function DrawDemo() {
  const [run, setRun] = useState(0);
  return <DemoRun key={run} restart={() => setRun((r) => r + 1)} />;
}

function DemoRun({ restart }: { restart: () => void }) {
  const state = useRef(EMPTY_DRAW);
  const [feed, setFeed] = useState(() => feedOf(EMPTY_DRAW));
  const [speed, setSpeed] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ended = useRef(false);
  const { r1 } = useFormat();
  useEffect(() => () => clearTimeout(timer.current), []);

  const onIdle = (idle: boolean) => {
    // once the draw is done the timers below run the rest; the stage going idle after each step must not cancel them
    if (!idle || ended.current) return;
    clearTimeout(timer.current);
    const s = state.current;
    const w = nextWheel(s.pairs);
    const pool = onWheel(w === "a" ? PA : PB, s.pairs, []);
    if (!pool.length) {
      // the demo ends like a real draw: the last team waits in the middle, End shows the final teams, then a new run
      ended.current = true;
      // then the bracket opens and fills one team at a time, seeded like the real one (average seed of the pair)
      const seeds = s.pairs.map((p, pair) => ({ pair, avg: (seedOf(p.a) + seedOf(p.b!)) / 2, best: Math.min(seedOf(p.a), seedOf(p.b!)) })).sort((x, y) => x.avg - y.avg || x.best - y.best);
      const slots: [number, number][] = r1.map(([s1, s2]) => [seeds[s1 - 1].pair, seeds[s2 - 1].pair]);
      const total = 2 * slots.length;
      const step = (shown: number) => {
        setFeed((f) => ({ ...f, seq: f.seq + 1, last: null, bracket: { shown, r1: slots } }));
        if (shown < total) {
          const slow = shown < SLOW_SLOTS || shown >= total - SLOW_SLOTS;
          timer.current = setTimeout(() => step(shown + 1), slow ? REVEAL_MS : REVEAL_MS / FAST);
          return;
        }
        // like the host's End: the overlay's "thanks for watching", then a new run
        timer.current = setTimeout(() => {
          setFeed((f) => ({ ...f, seq: f.seq + 1, last: null, thanks: true }));
          timer.current = setTimeout(restart, RESTART_MS);
        }, THANKS_AFTER_MS);
      };
      timer.current = setTimeout(() => {
        setSpeed(1);
        setFeed((f) => ({ ...f, ended: true, seeds: seeds.map(({ pair, avg }) => ({ pair, avg })), seq: f.seq + 1, last: null }));
        timer.current = setTimeout(() => step(0), TEAMS_MS);
      }, END_MS);
      return;
    }
    // the team this spin works on (a tier B spin finishes the one in the box)
    const team = w === "a" ? s.pairs.length + 1 : s.pairs.length;
    const pace = team <= SLOW_TEAMS || team > PA.length - SLOW_TEAMS ? 1 : FAST_SPINS;
    timer.current = setTimeout(() => {
      setSpeed(pace);
      // like the admin's last-team button: one player left on each wheel, both are placed at once
      if (pool.length === 1 && w === "a") {
        const b = onWheel(PB, s.pairs, []);
        const withA = addPick(s, { w, id: pool[0].id }, "spin");
        state.current = b.length === 1 ? addPick(withA, { w: "b", id: b[0].id }, "spin") : withA;
      } else state.current = addPick(s, { w, id: pool[Math.floor(Math.random() * pool.length)].id }, "spin");
      setFeed(feedOf(state.current));
    }, (s.seq ? GAP_MS : GAP_MS * 2) / pace);
  };

  useEffect(() => onIdle(true), []); // eslint-disable-line react-hooks/exhaustive-deps
  return <DrawStage feed={feed} onIdle={onIdle} wordmark speed={speed} thanks={<DrawThanks />} />;
}
