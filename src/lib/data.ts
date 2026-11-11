import { nameKey } from "@/lib/names";
import type { OutKind, Walkover } from "@/lib/out";
export type Player = {
  userId: number;
  username: string;
  avatar: string;
  country: string;
  pp: number;
  rank: number;
  countryRank: number;
  accuracy: number;
  isCaptain: boolean;
};

export type Team = {
  id: string;
  name: string;
  image: string;
  rawImage?: string;
  players: Player[];
  avgRank: number;
  avgPp: number;
  seed: number;
  /** set when the team is ruled out of the tournament */
  out: OutKind | null;
};

export type Beatmap = {
  slot: string;
  mod: string;
  title: string;
  version: string;
  creator: string;
  sr: number;
  bpm: number;
  length: number;
  ar: number;
  od: number;
  cs: number;
  cover: string;
  id: number;
};

export type Pack = { size: number; at: string | null };
export type Stage = { title: string; slug: string; pools: { category: string; color?: string; maps: Beatmap[] }[]; pack?: Pack | null; info?: { firstTo: number; bans: number } | null };

export type MatchSide = { id: string; name: string; score: number | null };
export type Match = {
  id: string;
  datetime: string | null;
  team1: MatchSide;
  team2: MatchSide;
  winner: 1 | 2 | null;
  /** a walkover: the side that gave the match up shows its tag (FF / DQ / Out) in place of a score */
  walkover: Walkover | null;
  links: string[];
  running?: boolean;
  round: string;
  bracket: "winners" | "losers" | "grand";
  stage: string;
  referee: string | null;
  streamer: string | null;
  commentators: string | null;
  vodUrl: string | null;
};

export type Sponsor = { id: number; name: string; image: string; url: string | null };

export type QualMap = { slot: string; title: string; version: string; creator: string; sr: number; bpm: number; cover: string; id: number; length: number };
export type QualPerf = { score: number; acc: number; placement: number; percentile: number; mods: string; rank: string; matchName: string; manual?: boolean };
export type QualPlayer = { id: number; username: string; avatar: string; cc: string; avgAcc: number; avgScore: number; zSum: number; perf: Record<string, QualPerf> };

export const fmtNum = (n: number) => n.toLocaleString("en-US");
export const teamHref = (t: { seed: number }) => `/teams/${t.seed}`;
export const teamFromHref = <T extends { seed: number }>(teams: T[], seg: string) => (/^[1-9]\d*$/.test(seg) ? teams.find((t) => t.seed === Number(seg)) : undefined);
export const userPath = (name: string) => nameKey(name);
export const pickemsHref = (name: string) => `/pickems/${encodeURIComponent(userPath(name)).replace(/%5B/g, "[").replace(/%5D/g, "]")}`;
export const cardCover = (url: string) => url.replace(/\/covers\/cover(@2x)?\.jpg/, "/covers/card@2x.jpg");
export const fmtLen = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const flagUrl = (cc: string) => `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
