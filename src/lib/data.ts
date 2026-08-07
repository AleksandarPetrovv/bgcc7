import teamsJson from "@/data/teams.json";
import mappoolsJson from "@/data/mappools.json";
import bracketJson from "@/data/bracket.json";
import staffJson from "@/data/staff.json";
import signupsJson from "@/data/signups.json";
import pickemsJson from "@/data/pickems.json";
import qualifiersJson from "@/data/qualifiers.json";

export type Player = {
  userId: number;
  username: string;
  avatar: string;
  country: string;
  pp: number;
  rank: number;
  countryRank: number;
  accuracy: number;
  seed: number;
  isCaptain: boolean;
};

export type Team = {
  id: string;
  name: string;
  image: string;
  players: Player[];
  avgRank: number;
  avgPp: number;
  seed: number;
};

type RawPlayer = (typeof teamsJson.teams)[number]["players"][number];

const toPlayer = (p: RawPlayer): Player => ({
  userId: p.userId,
  username: p.username,
  avatar: p.pfp,
  country: p.country,
  pp: p.pp,
  rank: p.rank,
  countryRank: p.countryRank,
  accuracy: p.accuracy,
  seed: p.seed,
  isCaptain: p.isCaptain,
});

export const teams: Team[] = teamsJson.teams
  .map((t) => {
    const players = t.players.map(toPlayer);
    return {
      id: t.id,
      name: t.name,
      image: t.image,
      players,
      avgRank: Math.round(players.reduce((s, p) => s + p.rank, 0) / players.length),
      avgPp: Math.round(players.reduce((s, p) => s + p.pp, 0) / players.length),
      seed: 0,
    };
  })
  .sort((a, b) => b.avgPp - a.avgPp)
  .map((t, i) => ({ ...t, seed: i + 1 }));

export const teamById = (id: string) => teams.find((t) => t.id === id);
export const teamByName = (name: string) => teams.find((t) => t.name === name);

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

export type Stage = { title: string; slug: string; pools: { category: string; maps: Beatmap[] }[] };

export const stages: Stage[] = mappoolsJson.mappools.map((s) => ({
  title: s.title,
  slug: s.title.toLowerCase().replace(/[^a-z]+/g, "-"),
  pools: s.pools.map((p) => ({
    category: p.category,
    maps: p.maps.map((m, i) => ({
      slot: `${MODS[p.category]?.short ?? p.category}${p.category === "Tiebreaker" ? "" : i + 1}`,
      mod: p.category,
      title: m.title,
      version: m.version,
      creator: m.creator,
      sr: m.sr,
      bpm: m.bpm,
      length: m.length,
      ar: m.ar,
      od: m.od,
      cs: m.cs,
      cover: m.cover_url,
      id: m.beatmap_id,
    })),
  })),
}));

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
};

type RawMatch = {
  id: string;
  datetime?: string;
  matchLink?: string;
  team1?: { id?: string; name?: string; score?: number | null } | null;
  team2?: { id?: string; name?: string; score?: number | null } | null;
  winner?: number | null;
};

const side = (s: RawMatch["team1"]): MatchSide => ({
  id: s?.id ?? "",
  name: s?.name && s.name !== "TBD" ? s.name : "TBD",
  score: s?.score ?? null,
});

const flatten = (
  stage: { rounds: { title?: string; matches: RawMatch[] }[] },
  bracket: Match["bracket"],
): Match[] =>
  stage.rounds.flatMap((r) =>
    r.matches.map((m) => ({
      id: m.id,
      datetime: m.datetime ?? null,
      team1: side(m.team1),
      team2: side(m.team2),
      winner: (m.winner === 1 || m.winner === 2 ? m.winner : null) as Match["winner"],
      links: m.matchLink?.match(/\d{6,}/g) ?? [],
      round: r.title ?? "",
      bracket,
    })),
  );

const bj = bracketJson as unknown as {
  winnersBracket: { rounds: { title?: string; matches: RawMatch[] }[] };
  losersBracket: { rounds: { title?: string; matches: RawMatch[] }[] };
  grandFinals: { rounds: { title?: string; matches: RawMatch[] }[] };
};

export const bracket = {
  winners: bj.winnersBracket.rounds.map((r) => ({ title: r.title ?? "", matches: flatten({ rounds: [r] }, "winners") })),
  losers: bj.losersBracket.rounds.map((r) => ({ title: r.title ?? "", matches: flatten({ rounds: [r] }, "losers") })),
  grand: bj.grandFinals.rounds.map((r) => ({ title: r.title ?? "", matches: flatten({ rounds: [r] }, "grand") })),
};

export const allMatches: Match[] = [
  ...flatten(bj.winnersBracket, "winners"),
  ...flatten(bj.losersBracket, "losers"),
  ...flatten(bj.grandFinals, "grand"),
];

export const DROP_SOURCES: Record<string, string> = {
  "LB-R1-M1.team1": "WB-R1-M1",
  "LB-R1-M1.team2": "WB-R1-M4",
  "LB-R1-M2.team1": "WB-R1-M2",
  "LB-R1-M2.team2": "WB-R1-M3",
  "LB-R2-M1.team1": "WB-R2-M2",
  "LB-R2-M2.team1": "WB-R2-M1",
  "LB-R4-M1.team1": "WB-R3-M1",
};

export type StaffMember = { username: string; avatar: string; country: string; roles: string[] };
const sj = staffJson as unknown as Record<string, { username: string; picture: string; country: string; roles: string[] }[]>;
const toStaff = (k: string): StaffMember[] =>
  (sj[k] ?? []).map((s) => ({ username: s.username, avatar: s.picture, country: s.country, roles: s.roles }));

export const staff = {
  organizational: toStaff("organizational"),
  assistive: toStaff("assistive"),
  sponsors: toStaff("sponsors"),
};

export type Signup = {
  userId: number;
  username: string;
  avatar: string;
  country: string;
  pp: number;
  rank: number;
  countryRank: number;
  accuracy: number;
  status: "approved" | "pending" | "denied";
  date: string;
};

export const signups: Signup[] = signupsJson.signups
  .map((s) => ({
    userId: s.userId,
    username: s.username,
    avatar: s.pfp,
    country: s.country.toLowerCase(),
    pp: s.pp,
    rank: s.rank,
    countryRank: s.countryRank,
    accuracy: s.accuracy,
    status: s.status as Signup["status"],
    date: s.signupDate,
  }))
  .sort((a, b) => b.pp - a.pp);

export const pickemLeaderboard = pickemsJson.leaderboard.map((e) => ({
  userId: e.user_id,
  username: e.username,
  avatar: e.avatar_url,
  score: e.score,
  correct: e.correct_count,
}));

export type QualMap = { slot: string; title: string; version: string; creator: string; sr: number; bpm: number; cover: string; id: number; length: number };
export type QualPerf = { score: number; acc: number; placement: number; percentile: number; mods: string; rank: string; matchName: string };
export type QualPlayer = { id: number; username: string; avatar: string; cc: string; avgAcc: number; avgScore: number; zSum: number; perf: Record<string, QualPerf> };

export const qualifiers = {
  maps: qualifiersJson.maps.map((m) => ({
    slot: m.slot,
    title: m.title,
    version: m.version,
    creator: m.creator,
    sr: m.sr,
    bpm: m.bpm,
    cover: m.cover_url,
    id: m.map_id,
    length: m.length,
  })) as QualMap[],
  players: qualifiersJson.players as unknown as QualPlayer[],
};

export const qualifierLobbies = (() => {
  const byLobby = new Map<string, QualPlayer[]>();
  for (const p of qualifiers.players) {
    const first = Object.values(p.perf)[0];
    if (!first) continue;
    const name = first.matchName.replace(/^BGCC6:\s*/i, "");
    byLobby.set(name, [...(byLobby.get(name) ?? []), p]);
  }
  const slots = ["Sat 28 Nov · 16:00", "Sat 28 Nov · 18:30", "Sat 28 Nov · 21:00", "Sun 29 Nov · 12:00", "Sun 29 Nov · 15:00", "Sun 29 Nov · 18:00", "Sun 29 Nov · 20:30"];
  return [...byLobby.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, players], i) => ({
      name: `Lobby ${String.fromCharCode(65 + Math.floor(i / 3))}${(i % 3) + 1}`,
      players,
      slot: slots[i % slots.length],
      referee: ["Raregendary", "SynchroHD", "Prahosnika"][i % 3],
    }));
})();

export const timeline = [
  { label: "Registrations", dates: "2 Nov – 22 Nov", key: "reg" },
  { label: "Screening", dates: "23 Nov – 25 Nov", key: "scr" },
  { label: "Qualifiers", dates: "28 Nov – 29 Nov", key: "qual" },
  { label: "Quarterfinals", dates: "5 Dec – 6 Dec", key: "qf" },
  { label: "Semifinals", dates: "12 Dec – 13 Dec", key: "sf" },
  { label: "Finals", dates: "19 Dec – 20 Dec", key: "f" },
  { label: "Grand finals", dates: "27 Dec", key: "gf" },
];

export const fmtNum = (n: number) => n.toLocaleString("en-US");
export const fmtLen = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const flagUrl = (cc: string) => `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
