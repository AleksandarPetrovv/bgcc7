import "server-only";
import { TWITCH_CHANNEL } from "./links";

export type LiveInfo = { title: string | null; viewers: number | null } | null;

const TTL = 60_000;
let cached: { at: number; value: LiveInfo } | null = null;
let token: { value: string; exp: number } | null = null;

async function helix(id: string, secret: string): Promise<LiveInfo> {
  if (!token || token.exp < Date.now() + 60_000) {
    const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`twitch token ${res.status}`);
    const j = (await res.json()) as { access_token: string; expires_in: number };
    token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  }
  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNEL}`, {
    headers: { "Client-Id": id, Authorization: `Bearer ${token.value}` },
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`twitch streams ${res.status}`);
  const s = ((await res.json()) as { data: { title: string; viewer_count: number }[] }).data[0];
  return s ? { title: s.title, viewers: s.viewer_count } : null;
}

async function decapi(): Promise<LiveInfo> {
  const res = await fetch(`https://decapi.me/twitch/uptime/${TWITCH_CHANNEL}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`decapi ${res.status}`);
  const text = (await res.text()).trim();
  if (/offline|error|not found|no user/i.test(text)) return null;
  return { title: null, viewers: null };
}

export async function getLive(): Promise<LiveInfo> {
  if (cached && Date.now() - cached.at < TTL) return cached.value;
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  try {
    const value = id && secret ? await helix(id, secret) : await decapi();
    cached = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.error("[twitch]", e);
    cached = { at: Date.now(), value: cached?.value ?? null };
    return cached.value;
  }
}
