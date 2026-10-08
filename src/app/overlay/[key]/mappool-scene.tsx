import type { CSSProperties } from "react";
import { MODS } from "@/lib/data";
import type { FeedMap, OverlayFeed } from "@/lib/overlay-types";
import styles from "./mappool-scene.module.css";

const GROUPS = ["NoMod", "Hidden", "HardRock", "DoubleTime", "Tiebreaker"] as const;
const TEAM_COLORS = { 1: "var(--color-rose)", 2: "var(--color-azure)" } as const;
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function groupFor(map: FeedMap) {
  const mod = normalize(map.mod);
  const group = GROUPS.find((key) => [key, MODS[key].short, MODS[key].label].some((value) => normalize(value) === mod));
  if (group) return group;
  if (mod && Object.keys(MODS).some((key) => normalize(key) === mod || normalize(MODS[key].short) === mod)) return undefined;
  const prefix = map.slot.trim().match(/^[a-z]+/i)?.[0].toLowerCase();
  return GROUPS.find((key) => MODS[key].short.toLowerCase() === prefix);
}

export function MappoolScene({ feed }: { feed: OverlayFeed }) {
  const groups = GROUPS.map((key) => ({ key, ...MODS[key], maps: [] as FeedMap[] }));
  for (const map of feed.pool) {
    const group = groups.find(({ key }) => key === groupFor(map));
    group?.maps.push(map);
  }
  const steps = new Map(feed.steps.map((step) => [normalize(step.slot), step]));
  const poolRows = Math.max(1, ...groups.map((group) => group.maps.length));

  return (
    <section className={styles.scene} style={{ "--pool-rows": poolRows } as CSSProperties} aria-label="mappool">
      <header className={styles.header}>
        <div className={`${styles.team} ${styles.red}`}>
          <span className={styles.teamName} title={feed.teams[0].name}>{feed.teams[0].name}</span>
        </div>
        <div className={styles.scoreboard}>
          <div className={styles.score} aria-label={`${feed.match.score[0]} to ${feed.match.score[1]}`}>
            <span className={styles.red}>{feed.match.score[0]}</span>
            <span className={styles.separator} aria-hidden>:</span>
            <span className={styles.blue}>{feed.match.score[1]}</span>
          </div>
          <span className={styles.firstTo}>first to {feed.match.firstTo}</span>
        </div>
        <div className={`${styles.team} ${styles.right} ${styles.blue}`}>
          <span className={styles.teamName} title={feed.teams[1].name}>{feed.teams[1].name}</span>
        </div>
      </header>

      <div className={styles.heading}>
        <h1>mappool</h1>
        <span className={styles.round} title={feed.match.round}>{feed.match.round}</span>
      </div>

      <div className={styles.columns}>
        {groups.map((group) => (
          <section key={group.key} className={styles.column} style={{ "--mod-color": group.color } as CSSProperties} aria-label={group.label.toLowerCase()}>
            <h2 className={styles.modHeading}>
              <span className={styles.modSlab}><span>{group.short.toLowerCase()}</span></span>
              <span className={styles.modName}>{group.label.toLowerCase()}</span>
            </h2>
            <div className={styles.cards}>
              {group.maps.map((map) => {
                const step = steps.get(normalize(map.slot));
                const banned = step?.kind === "ban";
                const picked = step?.kind === "pick";
                const winner = picked ? step.winner : null;
                const tagTeam = banned ? step.team : winner;
                const tagName = tagTeam ? feed.teams[tagTeam - 1].name : "";
                return (
                  <article
                    key={`${map.slot}-${map.id}`}
                    className={`${styles.card}${banned ? ` ${styles.banned}` : ""}${picked ? ` ${styles.picked}` : ""}`}
                    style={{ "--pick-color": picked ? TEAM_COLORS[step.team] : group.color } as CSSProperties}
                    aria-label={`${map.slot.toLowerCase()}, ${map.title}, ${map.version}, ${map.sr.toFixed(2)} stars${banned ? `, banned by ${tagName}` : picked ? `, picked by ${feed.teams[step.team - 1].name}` : ""}${winner ? `, won by ${tagName}` : ""}`}
                  >
                    <div className={styles.cover} style={map.cover ? { backgroundImage: `url(${JSON.stringify(map.cover)})` } : undefined} aria-hidden />
                    <div className={styles.cardContent}>
                      <div className={styles.cardTop}>
                        <span className={styles.slot}>{map.slot.toLowerCase()}</span>
                        {tagTeam && (
                          <span className={styles.status} style={{ "--tag-color": TEAM_COLORS[tagTeam] } as CSSProperties} title={`${tagName} ${banned ? "ban" : "win"}`}>
                            <span><b>{banned ? "ban" : "win"}</b><span className={styles.tagName}>{tagName}</span></span>
                          </span>
                        )}
                        <span className={styles.sr}>{map.sr.toFixed(2)}<span aria-hidden>★</span></span>
                      </div>
                      <h3 className={styles.title} title={map.title}>{map.title}</h3>
                      <p className={styles.difficulty} title={map.version}>{map.version}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
