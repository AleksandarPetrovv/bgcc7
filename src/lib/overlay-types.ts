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

// who acts next in the pick/ban phase; null while a map is being played or the draft has not started
export type FeedTurn = { kind: "pick" | "ban"; team: 1 | 2 } | { kind: "tb" } | null;

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
  current: FeedMap | null;
  live: LiveScore | null;
  scene: Scene;
  sceneAuto: boolean;
  at: number;
  build?: string;
};
