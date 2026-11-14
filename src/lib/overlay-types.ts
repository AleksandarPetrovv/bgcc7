import type { Scene } from "./scenes";
import type { ScorePacket } from "./relay-contract";

export type { LiveClient, ScorePacket } from "./relay-contract";

export type LiveScore = ScorePacket & {
  matchId: string;
  totals: [number, number];
  at: number;
};

export type FeedTeam = { id: string; name: string; image: string; players: { id: number; name: string; avatar: string; rank?: number | null; country?: string }[] };

export type FeedMap = { slot: string; mod: string; id: number; title: string; version: string; creator: string; sr: number; bpm: number; length: number; cs: number; ar: number; od: number; cover: string };

export type FeedMatch = {
  id: string;
  round: string;
  bracket: "winners" | "losers" | "grand";
  startsAt: string | null;
  teams: [string, string];
  score: [number | null, number | null];
  winner: 1 | 2 | null;
};

export type FeedGroup = { name: string; color: string; slots: string[] };

export type FeedStep = { team: 1 | 2; kind: "ban" | "pick"; slot: string; winner: 1 | 2 | null };

/** a lobby chat line on stream, already filtered (no BanchoBot, no commands, nothing the slur filter flagged) */
export type FeedChat = { key: string; at: number; name: string; avatar: string | null; side: 1 | 2 | null; ref: boolean; text: string };

export type FeedTurn ={ kind: "pick" | "ban"; team: 1 | 2 } | { kind: "tb" } | null;

/** the draft clock under the turn on stream. `until` is server time (compare with `OverlayFeed.at`):
 *  turn = the pick/ban clock, gap = the wait after a map result, timeout = an accepted team timeout, paused = the ref's pause */
export type FeedClock = { kind: "turn" | "gap"; until: number } | { kind: "timeout"; team: 1 | 2; until: number } | { kind: "paused" } | null;

export type OverlayFeed = {
  edition: string;
  tournament: string;
  match: {
    id: string;
    slug: string;
    round: string;
    startsAt: string | null;
    firstTo: number;
    score: [number, number];
    winner: 1 | 2 | null;
    streamer: string | null;
    commentators: string | null;
  };
  teams: [FeedTeam, FeedTeam];
  pool: FeedMap[];
  groups?: FeedGroup[];
  schedule?: FeedMatch[];
  steps: FeedStep[];
  rolls: [number | null, number | null];
  choice: "pick" | "ban" | null;
  turn?: FeedTurn;
  clock?: FeedClock;
  current: FeedMap | null;
  live: LiveScore | null;
  /** newest last; shown in the rolls, mappool, winner scenes and between maps */
  chat?: FeedChat[];
  scene: Scene;
  sceneAuto: boolean;
  /** /overlay/demo only: its scenes in play order, for the scene picker */
  demo?: Scene[];
  /** bracket scene only, once its reveal is over and the match has a box: the manual zoom toggle. `settled` = the overlay finished zooming */
  zoom?: { on: boolean; settled: boolean } | null;
  at: number;
  build?: string;
};
