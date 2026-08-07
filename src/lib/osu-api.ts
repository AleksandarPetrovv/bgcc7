import "server-only";

export type OsuScore = {
  user_id: number;
  score: number;
  accuracy: number;
  max_combo: number;
  mods: string[];
  rank: string;
  passed: boolean;
  statistics: { count_miss: number };
  match: { team: "red" | "blue" | "none"; pass: boolean };
};

export type OsuGame = {
  id: number;
  beatmap_id: number;
  end_time: string | null;
  mods: string[];
  team_type: string;
  beatmap: {
    version: string;
    beatmapset: { artist: string; title: string; covers: { cover: string; card: string } };
  } | null;
  scores: OsuScore[];
};

export type OsuUser = { id: number; username: string; avatar_url: string };

export type OsuMatch = {
  match: { id: number; name: string; start_time: string; end_time: string | null };
  events: { id: number; game?: OsuGame }[];
  users: OsuUser[];
  first_event_id: number;
};

let token: { value: string; exp: number } | null = null;

async function getToken() {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const res = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: Number(process.env.AUTH_OSU_ID),
      client_secret: process.env.AUTH_OSU_SECRET,
      grant_type: "client_credentials",
      scope: "public",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`osu token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.value;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`https://osu.ppy.sh/api/v2${path}`, {
    headers: { authorization: `Bearer ${await getToken()}`, accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`osu ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getMpMatch(id: string) {
  const first = await get<OsuMatch>(`/matches/${id}`);
  const events = [...first.events];
  const users = new Map(first.users.map((u) => [u.id, u]));
  for (let guard = 0; guard < 20 && events.length && events[0].id > first.first_event_id; guard++) {
    const page = await get<OsuMatch>(`/matches/${id}?before=${events[0].id}&limit=100`);
    if (!page.events.length) break;
    events.unshift(...page.events);
    for (const u of page.users) users.set(u.id, u);
  }
  return { ...first, events, users: [...users.values()] };
}
