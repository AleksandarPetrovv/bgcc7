import "server-only";
import { globalStore } from "./global-store";

const API = "https://discord.com/api/v10";
const token = () => process.env.DISCORD_BOT_TOKEN ?? "";
const guild = () => process.env.DISCORD_GUILD_ID ?? "";

export const discordReady = () => !!token() && !!guild();

async function call<T>(path: string, init?: RequestInit, tries = 3): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bot ${token()}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 429 && tries > 1) {
    const wait = Number((await res.json().catch(() => ({}))).retry_after ?? 1);
    await new Promise((r) => setTimeout(r, Math.min(10, wait) * 1000 + 100));
    return call(path, init, tries - 1);
  }
  if (!res.ok) throw new Error(`discord ${res.status} ${path.split("?")[0]}`);
  return (res.status === 204 ? null : res.json()) as Promise<T>;
}

export const guildId = guild;
const isMissing = (e: unknown) => e instanceof Error && / 404 /.test(e.message);

type Mentions = { parse?: ("everyone" | "roles" | "users")[]; roles?: string[]; users?: string[] };
export type Embed = { title?: string; description?: string; url?: string; color?: number; fields?: { name: string; value: string; inline?: boolean }[]; footer?: { text: string }; author?: { name: string }; timestamp?: string };

export async function post(channelId: string, content: string, opts: { mentions?: Mentions; embeds?: Embed[] } = {}) {
  const m = await call<{ id: string }>(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, embeds: opts.embeds, allowed_mentions: { parse: [], ...opts.mentions } }),
  });
  return m.id;
}

export async function deleteMessage(channelId: string, messageId: string) {
  await call(`/channels/${channelId}/messages/${messageId}`, { method: "DELETE" }).catch((e) => {
    if (!isMissing(e)) throw e;
  });
}

export const botUser = () => call<{ id: string }>("/users/@me");
export const guildChannels = () => call<{ id: string; name: string; type: number; parent_id: string | null; position: number }[]>(`/guilds/${guild()}/channels`);
export const guildRoles = () => call<{ id: string; name: string }[]>(`/guilds/${guild()}/roles`);

// one member's roles; null when they left the server. works without the Server Members intent (listing all members needs it)
export const memberRoles = (userId: string) =>
  call<{ roles: string[] }>(`/guilds/${guild()}/members/${userId}`).then(
    (m) => m.roles,
    (e) => {
      if (isMissing(e)) return null;
      throw e;
    },
  );

export const createRole = (name: string) =>
  call<{ id: string }>(`/guilds/${guild()}/roles`, { method: "POST", body: JSON.stringify({ name, mentionable: true, permissions: "0" }) });
export const editRole = (id: string, name: string) => call(`/guilds/${guild()}/roles/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
export const deleteRole = (id: string) =>
  call(`/guilds/${guild()}/roles/${id}`, { method: "DELETE" }).catch((e) => {
    if (!isMissing(e)) throw e;
  });

export type Overwrite = { id: string; type: 0 | 1; allow?: string; deny?: string };
export const createChannel = (name: string, type: 0 | 2 | 4, overwrites: Overwrite[], parent?: string) =>
  call<{ id: string }>(`/guilds/${guild()}/channels`, { method: "POST", body: JSON.stringify({ name, type, parent_id: parent, permission_overwrites: overwrites }) });
export const editChannel = (id: string, body: { name?: string; parent_id?: string; permission_overwrites?: Overwrite[] }) =>
  call(`/channels/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteChannel = (id: string) =>
  call(`/channels/${id}`, { method: "DELETE" }).catch((e) => {
    if (!isMissing(e)) throw e;
  });

export const addRole = (userId: string, roleId: string) => call(`/guilds/${guild()}/members/${userId}/roles/${roleId}`, { method: "PUT" });
export const removeRole = (userId: string, roleId: string) => call(`/guilds/${guild()}/members/${userId}/roles/${roleId}`, { method: "DELETE" });

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
const profiles = globalStore("bgccDcProfiles", () => new Map<string, { at: number; p: Profile | null }>());

// avatar + display name, cached an hour so avatar changes show up without asking discord on every page view
export async function discordProfile(id: string, fresh = false): Promise<Profile | null> {
  const hit = profiles.get(id);
  if (!fresh && hit && Date.now() - hit.at < PROFILE_TTL) return hit.p;
  const p = await call<{ username: string; global_name: string | null; avatar: string | null }>(`/users/${id}`)
    .then((u) => ({
      name: u.global_name || u.username,
      avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${id}/${u.avatar}.png?size=128` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> BigInt(22)) % BigInt(6))}.png`,
    }))
    .catch(() => hit?.p ?? null);
  profiles.set(id, { at: Date.now(), p });
  return p;
}
