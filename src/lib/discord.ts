import "server-only";

const API = "https://discord.com/api/v10";
const token = () => process.env.DISCORD_BOT_TOKEN ?? "";
const guild = () => process.env.DISCORD_GUILD_ID ?? "";

export const discordReady = () => !!token() && !!guild();

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bot ${token()}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`discord ${res.status} ${path.split("?")[0]}`);
  return res.json() as Promise<T>;
}

type Member = { user: { id: string; username: string; global_name: string | null; discriminator: string; bot?: boolean }; nick: string | null };

export async function findMember(raw: string): Promise<{ id: string; name: string } | null> {
  const name = raw.trim().replace(/^@/, "").toLowerCase();
  if (!name || name.length > 37) return null;
  const [base, disc] = name.split("#");
  const list = await call<Member[]>(`/guilds/${guild()}/members/search?query=${encodeURIComponent(base)}&limit=100`);
  const users = list.filter((m) => !m.user.bot);
  const exact = users.find((m) => m.user.username.toLowerCase() === base && (!disc || m.user.discriminator === disc));
  if (exact) return { id: exact.user.id, name: exact.user.username };
  const loose = users.filter((m) => [m.user.global_name, m.nick].some((n) => n?.toLowerCase() === base));
  return loose.length === 1 ? { id: loose[0].user.id, name: loose[0].user.username } : null;
}

export async function dm(userId: string, content: string) {
  const ch = await call<{ id: string }>("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: userId }) });
  await call(`/channels/${ch.id}/messages`, { method: "POST", body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) });
}

type Profile = { name: string; avatar: string };
const PROFILE_TTL = 60 * 60_000;
const gp = globalThis as unknown as { bgccDcProfiles?: Map<string, { at: number; p: Profile | null }> };
const profiles = (gp.bgccDcProfiles ??= new Map());

// avatar + display name, cached an hour so avatar changes show up without asking discord on every page view
export async function discordProfile(id: string, fresh = false): Promise<Profile | null> {
  const hit = profiles.get(id);
  if (!fresh && hit && Date.now() - hit.at < PROFILE_TTL) return hit.p;
  const p = await call<{ username: string; global_name: string | null; avatar: string | null }>(`/users/${id}`)
    .then((u) => ({
      name: u.global_name || u.username,
      avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=128` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> BigInt(22)) % BigInt(6))}.png`,
    }))
    .catch(() => hit?.p ?? null);
  profiles.set(id, { at: Date.now(), p });
  return p;
}
