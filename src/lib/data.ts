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

export const MODS: Record<string, { label: string; short: string; color: string }> = {
  NoMod: { label: "No Mod", short: "NM", color: "var(--color-mod-nm)" },
  Hidden: { label: "Hidden", short: "HD", color: "var(--color-mod-hd)" },
  HardRock: { label: "Hard Rock", short: "HR", color: "var(--color-mod-hr)" },
  DoubleTime: { label: "Double Time", short: "DT", color: "var(--color-mod-dt)" },
  FreeMod: { label: "Free Mod", short: "FM", color: "var(--color-mod-fm)" },
  Tiebreaker: { label: "Tiebreaker", short: "TB", color: "var(--color-mod-tb)" },
};

export type Pack = { size: number; at: string | null };
export type Stage = { title: string; slug: string; pools: { category: string; maps: Beatmap[] }[]; pack?: Pack | null };

export type MatchSide = { id: string; name: string; score: number | null };
export type Match = {
  id: string;
  datetime: string | null;
  team1: MatchSide;
  team2: MatchSide;
  winner: 1 | 2 | null;
  links: string[];
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
export const fmtLen = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const flagUrl = (cc: string) => `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
