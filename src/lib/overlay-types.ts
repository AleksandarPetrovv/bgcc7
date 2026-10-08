import type { Scene } from "./scenes";

export type LiveClient = {
  ipcId: number;
  team: "left" | "right";
  userId: number;
  name: string;
  score: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
  mods: string[];
  failed: boolean;
};

// what the helper posts to /api/relay/score, about 10 times a second
export type ScorePacket = {
  ipcState: number;
  mapId: number;
  clients: LiveClient[];
};

export type LiveScore = ScorePacket & {
  matchId: string;
  totals: [number, number];
  at: number;
};

export type FeedTeam = { id: string; name: string; image: string; players: { id: number; name: string; avatar: string }[] };

export type FeedMap = { slot: string; mod: string; id: number; title: string; version: string; creator: string; sr: number; bpm: number; length: number; cs: number; ar: number; od: number; cover: string };

export type FeedStep = { team: 1 | 2; kind: "ban" | "pick"; slot: string; winner: 1 | 2 | null };

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
  steps: FeedStep[];
  current: FeedMap | null;
  live: LiveScore | null;
  scene: Scene;
  sceneAuto: boolean;
  at: number;
};
