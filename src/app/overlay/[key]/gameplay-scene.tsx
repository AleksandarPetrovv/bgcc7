"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { LiveClient, OverlayFeed } from "@/lib/overlay-types";
import styles from "./gameplay-scene.module.css";

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Count = memo(function Count({ value, decimals = false, reduced }: { value: number; decimals?: boolean; reduced: boolean }) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const [initial] = useState(() => (decimals ? decimal : integer).format(value));

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const format = decimals ? decimal : integer;
    const from = shown.current;
    let frame = 0;

    if (reduced || from === value) {
      shown.current = value;
      element.textContent = format.format(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 95);
      shown.current = from + (value - from) * progress;
      element.textContent = format.format(shown.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, decimals, reduced]);

  return <span ref={node}>{initial}</span>;
});

function SetStars({ score, firstTo }: { score: number; firstTo: number }) {
  return (
    <span className={styles.stars} aria-label={`${score} of ${firstTo}`}>
      {Array.from({ length: firstTo }, (_, index) => (
        <svg key={index} viewBox="0 0 24 24" aria-hidden="true" data-filled={index < score}>
          <path d="m12 2 3.09 6.26 6.91 1-5 4.88 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.26l6.91-1Z" />
        </svg>
      ))}
    </span>
  );
}

function Player({ client, reduced }: { client: LiveClient; reduced: boolean }) {
  return (
    <div className={styles.player}>
      <span className={styles.playerName} title={client.name}>{client.name}</span>
      <span className={styles.playerScore}><Count value={client.score} reduced={reduced} /></span>
      <span className={styles.playerDetails}>
        <span><Count value={client.accuracy} decimals reduced={reduced} />%</span>
        <span><Count value={client.combo} reduced={reduced} />x</span>
      </span>
    </div>
  );
}

function lengthText(length: number) {
  const seconds = Math.max(0, Math.floor(length));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function GameplayScene({ feed }: { feed: OverlayFeed }) {
  const reduced = useReducedMotion() !== false;
  const { live, current } = feed;
  const total = live ? live.totals[0] + live.totals[1] : 0;
  const share = total > 0 && live ? live.totals[0] / total : 0.5;

  return (
    <div className={styles.scene}>
      <header className={styles.top}>
        {feed.teams.map((team, index) => (
          <section key={team.id} className={`${styles.team} ${index === 0 ? styles.red : styles.blue}`}>
            <div className={styles.teamHeader}>
              <h2 className={styles.teamName} title={team.name}>{team.name}</h2>
              <SetStars score={feed.match.score[index]} firstTo={feed.match.firstTo} />
            </div>
            {live ? (
              <div className={styles.players} key={`${feed.match.id}:${live.mapId}`}>
                {live.clients.filter((client) => client.team === (index === 0 ? "left" : "right")).map((client) => (
                  <Player key={`${client.ipcId}:${client.userId}`} client={client} reduced={reduced} />
                ))}
              </div>
            ) : null}
          </section>
        ))}
        {live ? (
          <div className={styles.live} key={`${feed.match.id}:${live.mapId}`}>
            <div className={styles.totals}>
              <span className={styles.total} aria-label="red total"><Count value={live.totals[0]} reduced={reduced} /></span>
              <span className={styles.total} aria-label="blue total"><Count value={live.totals[1]} reduced={reduced} /></span>
            </div>
            <div className={styles.scoreBar} aria-label={`red ${Math.round(share * 100)}%, blue ${Math.round((1 - share) * 100)}%`}>
              <span className={styles.redShare} style={{ width: `${share * 100}%` }} />
            </div>
            <div className={styles.difference}>
              <span>red − blue</span>
              <span className={styles.differenceValue}><Count value={live.totals[0] - live.totals[1]} reduced={reduced} /></span>
            </div>
          </div>
        ) : null}
      </header>
      <footer className={styles.bottom}>
        {current ? (
          <>
            <span className={styles.slot}><span>{current.slot}</span></span>
            <div className={styles.map}>
              <h3 className={styles.mapTitle} title={current.title}>{current.title}</h3>
              <span className={styles.version} title={current.version}>[{current.version}]</span>
            </div>
            <dl className={styles.stats}>
              <div><dt>sr</dt><dd>{current.sr.toFixed(2)}</dd></div>
              <div><dt>bpm</dt><dd>{integer.format(current.bpm)}</dd></div>
              <div><dt>cs</dt><dd>{current.cs.toFixed(1)}</dd></div>
              <div><dt>ar</dt><dd>{current.ar.toFixed(1)}</dd></div>
              <div><dt>od</dt><dd>{current.od.toFixed(1)}</dd></div>
              <div><dt>length</dt><dd>{lengthText(current.length)}</dd></div>
            </dl>
          </>
        ) : null}
      </footer>
    </div>
  );
}
