import "server-only";
import { getMpMatch, type OsuGame } from "./osu-api";
import type { Match, Stage, Team } from "./data";

export type PlayerLine = {
  id: number;
  name: string;
  avatar: string;
  score: number;
  acc: number;
  combo: number;
  miss: number;
  mods: string[];
  rank: string;
};

export type MapResult = {
  lobby: number;
  beatmapId: number;
  slot: string | null;
  mod: string | null;
  title: string;
  artist: string;
  version: string;
  cover: string;
  mods: string[];
  team1: number;
  team2: number;
  winner: 0 | 1 | 2;
  running: [number, number];
  players: [PlayerLine[], PlayerLine[]];
  note: "warmup" | "aborted" | "replayed" | null;
};

export type PlayerTotal = { id: number; name: string; avatar: string; team: 1 | 2; score: number; maps: number; acc: number };

export type Scoreboard = {
  lobbies: { id: string; name: string }[];
  maps: MapResult[];
  score: [number, number];
  totals: PlayerTotal[];
};

export function poolOf(stages: Stage[], preferred: string) {
  const pool = new Map<number, { slot: string; mod: string }>();
  for (const s of [...stages].sort((a, b) => Number(b.slug === preferred) - Number(a.slug === preferred)))
    for (const p of s.pools) for (const m of p.maps) if (!pool.has(m.id)) pool.set(m.id, { slot: m.slot, mod: m.mod });
  return pool;
}

const shownMods = (mods: string[]) => mods.filter((m) => m !== "NF");

export async function buildScoreboard(match: Match, teams: Team[], POOL: Map<number, { slot: string; mod: string }>): Promise<Scoreboard> {
  const rosterIds = (teamId: string) => new Set((teams.find((t) => t.id === teamId)?.players ?? []).map((p) => p.userId));
  const ids: [Set<number>, Set<number>] = [rosterIds(match.team1.id), rosterIds(match.team2.id)];
  const lobbies = await Promise.all(match.links.map((id) => getMpMatch(id)));

  const users = new Map<number, { name: string; avatar: string }>();
  const games: { lobby: number; game: OsuGame }[] = [];
  lobbies.forEach((l, lobby) => {
    for (const u of l.users) users.set(u.id, { name: u.username, avatar: u.avatar_url });
    for (const e of l.events) if (e.game) games.push({ lobby, game: e.game });
  });

  const colorTeam = lobbies.map((_, lobby) => {
    let redIsTeam1 = 0;
    for (const { game } of games.filter((g) => g.lobby === lobby))
      for (const s of game.scores) {
        const c = s.match?.team;
        if (c !== "red" && c !== "blue") continue;
        const sign = c === "red" ? 1 : -1;
        if (ids[0].has(s.user_id)) redIsTeam1 += sign;
        if (ids[1].has(s.user_id)) redIsTeam1 -= sign;
      }
    const red: 1 | 2 = redIsTeam1 >= 0 ? 1 : 2;
    return { red, blue: (red === 1 ? 2 : 1) as 1 | 2 };
  });

  const teamOf = (lobby: number, s: OsuGame["scores"][number]): 1 | 2 | null => {
    if (ids[0].has(s.user_id)) return 1;
    if (ids[1].has(s.user_id)) return 2;
    const c = s.match?.team;
    return c === "red" || c === "blue" ? colorTeam[lobby][c] : null;
  };

  const maps: MapResult[] = [];
  const score: [number, number] = [0, 0];
  const totals = new Map<number, PlayerTotal & { accSum: number }>();

  games.forEach(({ lobby, game }, i) => {
    const pool = POOL.get(game.beatmap_id) ?? null;
    const next = games[i + 1]?.game;
    const note: MapResult["note"] = !game.end_time || !game.scores.length ? "aborted" : !pool ? "warmup" : next && next.beatmap_id === game.beatmap_id ? "replayed" : null;
    const players: [PlayerLine[], PlayerLine[]] = [[], []];
    for (const s of game.scores) {
      const team = teamOf(lobby, s);
      if (!team) continue;
      const u = users.get(s.user_id);
      players[team - 1].push({
        id: s.user_id,
        name: u?.name ?? String(s.user_id),
        avatar: u?.avatar ?? `https://a.ppy.sh/${s.user_id}`,
        score: s.score,
        acc: s.accuracy,
        combo: s.max_combo,
        miss: s.statistics?.count_miss ?? 0,
        mods: shownMods(s.mods?.length ? s.mods : game.mods),
        rank: s.rank,
      });
    }
    for (const side of players) side.sort((a, b) => b.score - a.score);
    const team1 = players[0].reduce((n, p) => n + p.score, 0);
    const team2 = players[1].reduce((n, p) => n + p.score, 0);
    const winner: MapResult["winner"] = note ? 0 : team1 > team2 ? 1 : team2 > team1 ? 2 : 0;
    if (winner) score[winner - 1]++;
    if (!note)
      players.forEach((side, k) =>
        side.forEach((p) => {
          const t = totals.get(p.id) ?? { id: p.id, name: p.name, avatar: p.avatar, team: (k + 1) as 1 | 2, score: 0, maps: 0, acc: 0, accSum: 0 };
          t.score += p.score;
          t.maps++;
          t.accSum += p.acc;
          totals.set(p.id, t);
        }),
      );
    const set = game.beatmap?.beatmapset;
    maps.push({
      lobby,
      beatmapId: game.beatmap_id,
      slot: pool?.slot ?? null,
      mod: pool?.mod ?? null,
      title: set?.title ?? `#${game.beatmap_id}`,
      artist: set?.artist ?? "",
      version: game.beatmap?.version ?? "",
      cover: set?.covers.cover ?? "",
      mods: shownMods(game.mods),
      team1,
      team2,
      winner,
      running: [score[0], score[1]],
      players,
      note,
    });
  });

  return {
    lobbies: lobbies.map((l, i) => ({ id: match.links[i], name: l.match.name })),
    maps,
    score,
    totals: [...totals.values()]
      .map(({ accSum, ...t }) => ({ ...t, acc: t.maps ? accSum / t.maps : 0 }))
      .sort((a, b) => b.score - a.score),
  };
}
