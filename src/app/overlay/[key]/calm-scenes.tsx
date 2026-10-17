"use client";

import { useEffect, useState } from "react";
import type { FeedTeam, OverlayFeed } from "@/lib/overlay-types";
import styles from "./calm-scenes.module.css";

function SceneImage({ src, className }: { src: string; className: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src.trim() || failed === src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={256} height={256} className={className} decoding="async" onError={() => setFailed(src)} />;
}

function Countdown({ startsAt, at }: { startsAt: string | null; at: number }) {
  const [now, setNow] = useState<number | null>(null);
  const start = startsAt ? Date.parse(startsAt) : NaN;

  useEffect(() => {
    if (!Number.isFinite(start)) return;
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [start]);

  const remaining = Math.ceil((start - Math.max(at, now ?? at)) / 1000);
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const parts = [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60];

  return (
    <div className={styles.countdown}>
      <span className={styles.eyebrow}>starting in</span>
      <div className={styles.clock} role="timer" aria-live="off" aria-label={parts.map((part) => String(part).padStart(2, "0")).join(":")}>
        {parts.map((part, index) => (
          <span key={index} className={styles.clockPart}>
            {index > 0 ? <span className={styles.colon} aria-hidden>:</span> : null}
            <span>{String(part).padStart(2, "0")}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Matchup({ teams }: { teams: OverlayFeed["teams"] }) {
  return (
    <div className={styles.matchup}>
      <div className={`${styles.matchupTeam} ${styles.red}`}><span>{teams[0].name}</span></div>
      <span className={styles.versus}>vs</span>
      <div className={`${styles.matchupTeam} ${styles.blue}`}><span>{teams[1].name}</span></div>
    </div>
  );
}

function TeamIntro({ team, side }: { team: FeedTeam; side: 0 | 1 }) {
  return (
    <section className={`${styles.teamSlab} ${side === 0 ? styles.red : styles.blue}`}>
      <div className={styles.teamInner}>
        <div className={styles.teamIdentity}>
          {team.image.trim() ? <div className={styles.teamImageFrame}><SceneImage src={team.image} className={styles.teamImage} /></div> : null}
          <h2 className={styles.teamName}>{team.name}</h2>
        </div>
        <div className={styles.players}>
          {team.players.map((player) => (
            <div key={player.id} className={styles.player}>
              <div className={styles.avatarFrame}><SceneImage src={player.avatar} className={styles.avatar} /></div>
              <span className={styles.playerName}>{player.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalScore({ feed }: { feed: OverlayFeed }) {
  return (
    <div className={styles.result}>
      <div className={styles.finalScore} aria-label={`${feed.teams[0].name} ${feed.match.score[0]}, ${feed.teams[1].name} ${feed.match.score[1]}`}>
        <span>{feed.match.score[0]}</span>
        <span className={styles.scoreDivider} aria-hidden>:</span>
        <span>{feed.match.score[1]}</span>
      </div>
      <Matchup teams={feed.teams} />
    </div>
  );
}

export function CalmScene({ feed }: { feed: OverlayFeed }) {
  const scene = feed.scene;
  if (scene !== "soon" && scene !== "intro" && scene !== "winner" && scene !== "brb" && scene !== "end") return null;
  const winner = feed.match.winner === 1 ? feed.teams[0] : feed.match.winner === 2 ? feed.teams[1] : null;

  return (
    <div className={`${styles.scene} ${scene === "winner" ? styles.winnerScene : ""}`}>
      <div className={styles.backgroundSlab} aria-hidden />
      <header className={styles.header}>
        <span className={styles.tournament}>{feed.tournament}</span>
        <span className={styles.round}>{feed.match.round}</span>
      </header>

      {scene === "soon" ? (
        <div className={styles.soon}>
          <h1 className={styles.tournamentTitle}>{feed.tournament}</h1>
          <Countdown key={`${feed.match.id}:${feed.match.startsAt}`} startsAt={feed.match.startsAt} at={feed.at} />
          <Matchup teams={feed.teams} />
        </div>
      ) : null}

      {scene === "intro" ? (
        <div className={styles.intro}>
          <TeamIntro team={feed.teams[0]} side={0} />
          <span className={styles.introVersus}>vs</span>
          <TeamIntro team={feed.teams[1]} side={1} />
        </div>
      ) : null}

      {scene === "winner" ? (
        <div className={styles.winner}>
          {winner ? (
            <>
              <h1 className={styles.winnerLabel}>winner</h1>
              <div className={`${styles.winnerSlab} ${feed.match.winner === 1 ? styles.red : styles.blue}`}>
                <div className={styles.winnerInner}>
                  {winner.image.trim() ? <div className={styles.winnerImageFrame}><SceneImage src={winner.image} className={styles.teamImage} /></div> : null}
                  <h2 className={styles.winnerName}>{winner.name}</h2>
                </div>
              </div>
            </>
          ) : <h1 className={styles.resultTitle}>match score</h1>}
          <FinalScore feed={feed} />
        </div>
      ) : null}

      {scene === "brb" || scene === "end" ? (
        <div className={styles.intermission}>
          <div className={styles.messageSlab}>
            <h1 className={styles.message}>{scene === "brb" ? <>be right<br />back</> : <>thanks for<br />watching</>}</h1>
          </div>
          {scene === "brb" ? <Matchup teams={feed.teams} /> : <p className={styles.endTournament}>{feed.tournament}</p>}
        </div>
      ) : null}

      <div className={styles.bottomLine} aria-hidden />
    </div>
  );
}
