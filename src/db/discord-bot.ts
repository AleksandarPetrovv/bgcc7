import "server-only";
import { and, eq, inArray, isNotNull, like, not, sql } from "drizzle-orm";
import { currentEdition, db, detached, isBGCC6, withEdition } from "./index";
import { discordState, discordTeams, drafts, stages, users } from "./schema";
import { getMatchRows, getMatches, getTeams, type MatchRow } from "./tournament";
import { getPoolStages } from "./mappools";
import { getScoreboard } from "./scoreboards";
import { getFormat } from "./edition";
import { dicts, roundName } from "@/lib/i18n/dict";
import { matchNum } from "@/lib/format";
import { siteUrl } from "@/lib/links";
import { matchCosts } from "@/lib/match-cost";
import { when } from "@/lib/discord-text";
import type { Match } from "@/lib/data";
import type { Scoreboard } from "@/lib/scoreboard";
import {
  addRole, botUser, createChannel, createRole, deleteChannel, deleteMessage, deleteRole, discordReady, dm, editChannel, editRole,
  guildChannels, guildId, guildRoles, memberRoles, post, removeRole, type Embed, type Overwrite,
} from "@/lib/discord";
import { staffNames } from "@/lib/staff-names";

const ready = () => discordReady() && !isBGCC6();
const log = (what: string) => (e: unknown) => console.error(`[discord] ${what}`, e);

export const later = (what: string, fn: () => Promise<unknown>) => {
  if (ready()) detached(`discord ${what}`, fn);
};

// ---- stored state ----

type State = { channelId: string; messageId: string; stamp: string };
const getState = async (key: string) => (await db.select().from(discordState).where(eq(discordState.key, key)).limit(1))[0] ?? null;
const setState = (key: string, v: Partial<State>) =>
  db.insert(discordState).values({ key, ...v, updatedAt: new Date() }).onConflictDoUpdate({ target: discordState.key, set: { ...v, updatedAt: new Date() } });

export type DiscordCfg = { results: string; pool: string };
export async function getCfg(): Promise<DiscordCfg> {
  const rows = await db.select().from(discordState).where(like(discordState.key, "cfg:%"));
  const v = (k: string) => rows.find((r) => r.key === `cfg:${k}`)?.channelId ?? "";
  return { results: v("results"), pool: v("pool") };
}
export const setCfg = (k: keyof DiscordCfg, channelId: string) => setState(`cfg:${k}`, { channelId });

// ---- team roles + channels ----

const VIEW = 1 << 10;
const SEND = 1 << 11;
const HISTORY = 1 << 16;
const CONNECT = 1 << 20;
const SPEAK = 1 << 21;
const bits = (...p: number[]) => String(p.reduce((a, b) => a | b, 0));
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "team";

const g = globalThis as unknown as { bgccDcSync?: Promise<void>; bgccDcSynced?: number };

/** creates missing team roles/channels, renames, removes ones of deleted teams and fixes who has which role. queued, never parallel */
export function syncTeams() {
  if (!ready()) return Promise.resolve();
  const ed = currentEdition();
  g.bgccDcSync = (g.bgccDcSync ?? Promise.resolve()).then(() => withEdition(ed, runSync)).catch(log("sync"));
  return g.bgccDcSync;
}

type TeamRow = typeof discordTeams.$inferSelect;
const dropTeam = async (r: TeamRow) => {
  for (const id of [r.channelId, r.voiceId, r.categoryId]) if (id) await deleteChannel(id);
  await deleteRole(r.roleId);
};

async function runSync() {
  const [ts, rows, roles, chans, me] = await Promise.all([getTeams(), db.select().from(discordTeams), guildRoles(), guildChannels(), botUser()]);
  const hidden: Overwrite = { id: guildId(), type: 0, deny: bits(VIEW) };
  const open = bits(VIEW, SEND, HISTORY, CONNECT, SPEAK);
  const bot: Overwrite = { id: me.id, type: 1, allow: open };
  // hosts + refs see every team section. shortcut: found by role name, rename here if the real server calls them differently
  const staff: Overwrite[] = roles.filter((r) => ["host", "referee"].includes(r.name.toLowerCase())).map((r) => ({ id: r.id, type: 0, allow: open }));
  const perms = (roleId: string): Overwrite[] => [hidden, { id: roleId, type: 0, allow: open }, ...staff, bot];
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  const chanName = new Map(chans.map((c) => [c.id, c.name]));
  const ids = new Set(ts.map((t) => t.id));
  const have = new Map<string, TeamRow>();
  for (const r of rows) {
    // deleted by hand in discord: rebuild the whole section
    if (!ids.has(r.teamId) || !roleName.has(r.roleId) || !chanName.has(r.channelId)) {
      await dropTeam(r);
      await db.delete(discordTeams).where(eq(discordTeams.teamId, r.teamId));
    } else have.set(r.teamId, r);
  }
  const save = async (row: TeamRow) => {
    await db.insert(discordTeams).values(row).onConflictDoUpdate({ target: discordTeams.teamId, set: row });
    have.set(row.teamId, row);
  };
  // each team: a category named after it with #team (text) and "team vc" (voice)
  for (const t of ts) {
    const vcName = t.name;
    let r = have.get(t.id);
    if (!r) {
      const role = await createRole(t.name);
      const cat = await createChannel(t.name, 4, perms(role.id));
      const ch = await createChannel(slug(t.name), 0, perms(role.id), cat.id);
      const vc = await createChannel(vcName, 2, perms(role.id), cat.id);
      await save({ teamId: t.id, roleId: role.id, channelId: ch.id, categoryId: cat.id, voiceId: vc.id });
      continue;
    }
    if (!chanName.has(r.categoryId)) {
      const cat = await createChannel(t.name, 4, perms(r.roleId));
      await editChannel(r.channelId, { parent_id: cat.id, permission_overwrites: perms(r.roleId) });
      if (chanName.has(r.voiceId)) await editChannel(r.voiceId, { parent_id: cat.id });
      r = { ...r, categoryId: cat.id };
      await save(r);
    } else if (chanName.get(r.categoryId) !== t.name) await editChannel(r.categoryId, { name: t.name });
    if (!chanName.has(r.voiceId)) await save({ ...r, voiceId: (await createChannel(vcName, 2, perms(r.roleId), r.categoryId)).id });
    else if (chanName.get(r.voiceId) !== vcName) await editChannel(r.voiceId, { name: vcName });
    if (roleName.get(r.roleId) !== t.name) await editRole(r.roleId, t.name);
    if (chanName.get(r.channelId) !== slug(t.name)) await editChannel(r.channelId, { name: slug(t.name) });
  }
  // the old shared "BGCC7 teams" category is empty now
  const old = (await getState("cfg:category"))?.channelId;
  if (old) {
    await deleteChannel(old);
    await db.delete(discordState).where(eq(discordState.key, "cfg:category"));
  }
  const linked = new Map((await db.select({ osuId: users.osuId, discordId: users.discordId }).from(users).where(isNotNull(users.discordId))).map((u) => [u.osuId, u.discordId!]));
  const want = new Map<string, string>();
  for (const t of ts)
    for (const p of t.players) {
      const d = linked.get(p.userId);
      const r = have.get(t.id);
      if (d && r) want.set(d, r.roleId);
    }
  const ours = new Set([...have.values()].map((r) => r.roleId));
  // only linked users are checked here; unlink/relink strips the old account first (dropTeamRoles)
  for (const d of new Set(linked.values())) {
    const roles = await memberRoles(d);
    if (!roles) continue;
    const w = want.get(d);
    for (const rid of roles) if (ours.has(rid) && rid !== w) await removeRole(d, rid);
    if (w && !roles.includes(w)) await addRole(d, w);
  }
}

/** strips every team role from a discord account the site stops tracking (unlink / relink) */
export async function dropTeamRoles(discordId: string) {
  const ours = new Set((await db.select({ r: discordTeams.roleId }).from(discordTeams)).map((x) => x.r));
  for (const rid of (await memberRoles(discordId)) ?? []) if (ours.has(rid)) await removeRole(discordId, rid);
}

/** after the cup: deletes every team section (category, text, voice) + role, forgets sent posts (picked channels stay) */
export async function cleanupDiscord() {
  if (!ready()) return;
  await g.bgccDcSync;
  for (const r of await db.select().from(discordTeams)) await dropTeam(r);
  const cat = await getState("cfg:category");
  if (cat?.channelId) await deleteChannel(cat.channelId);
  await db.delete(discordTeams);
  await db.delete(discordState).where(not(inArray(discordState.key, ["cfg:results", "cfg:pool"])));
}

// ---- posts ----

const teamLinks = async () => new Map((await db.select().from(discordTeams)).map((r) => [r.teamId, r]));
const ping = (roleId: string) => ({ roles: [roleId] });

export function matchLabel(id: string, round: string) {
  const num = matchNum(getFormat(), id);
  return `${roundName(dicts.en, round)}${num ? ` Match ${num}` : ""}`;
}

// posts a new message for this key and deletes the one it replaces
async function chain(key: string, channelId: string, content: string, stamp: string, roleId?: string) {
  const prev = await getState(key);
  if (prev?.messageId) await deleteMessage(prev.channelId, prev.messageId).catch(log("delete"));
  const messageId = await post(channelId, content, { mentions: roleId ? ping(roleId) : undefined });
  await setState(key, { channelId, messageId, stamp });
}

const sides = (m: Pick<MatchRow, "team1Id" | "team2Id">) =>
  [
    [m.team1Id!, m.team2Id!],
    [m.team2Id!, m.team1Id!],
  ] as const;

/** every minute: 35 / 10 min invite reminders in both team channels + the ref DM */
export async function tick() {
  if (!ready()) return;
  // shortcut: team edits/draws reach discord through this 5 min resync instead of hooks in every admin team action
  if (Date.now() - (g.bgccDcSynced ?? 0) > 5 * 60_000) {
    g.bgccDcSynced = Date.now();
    await syncTeams();
  }
  const [rows, ts, links] = await Promise.all([getMatchRows(), getTeams(), teamLinks()]);
  const name = (id: string) => ts.find((t) => t.id === id)?.name ?? id;
  const now = Date.now();
  for (const m of rows) {
    if (!m.startsAt || m.winner != null || !m.team1Id || !m.team2Id) continue;
    const left = m.startsAt.getTime() - now;
    if (left <= 0 || left > 35 * 60_000) continue;
    const start = m.startsAt.toISOString();
    await refDm(m, name).catch(log("ref dm"));
    if (await getState(`invited:${m.id}`)) continue;
    const step = left > 10 * 60_000 ? "t35" : "t10";
    for (const [mine, opp] of sides(m)) {
      const l = links.get(mine);
      if (!l) continue;
      const key = `remind:${m.id}:${mine}`;
      if ((await getState(key))?.stamp === `${start}|${step}`) continue;
      const text = `<@&${l.roleId}> Invites for your match against **${name(opp)}** go out in ${step === "t35" ? "30" : "5"} minutes.`;
      await chain(key, l.channelId, text, `${start}|${step}`, l.roleId).catch(log("reminder"));
    }
  }
}

async function refDm(m: MatchRow, name: (id: string) => string) {
  const start = m.startsAt!.toISOString();
  const key = `ref:${m.id}`;
  if ((await getState(key))?.stamp === start) return;
  const names = staffNames(m.referee).map((x) => x.toLowerCase());
  if (!names.length) return;
  const refs = await db.select({ discordId: users.discordId }).from(users).where(and(inArray(sql`lower(${users.username})`, names), isNotNull(users.discordId)));
  const [d] = await db.select({ open: drafts.open }).from(drafts).where(eq(drafts.matchId, m.id)).limit(1);
  const link = d?.open ? `Pick and ban page: <${siteUrl()}/matches/${m.id}>` : `Open it from the admin pick and ban page: <${siteUrl()}/admin/draft>`;
  const text = `You're reffing **${name(m.team1Id!)} vs ${name(m.team2Id!)}** (${matchLabel(m.id, m.round)}) at **${when(m.startsAt!)}**. ${link}`;
  for (const r of refs) await dm(r.discordId!, text);
  await setState(key, { stamp: start });
}

/** the ref opened the lobby, osu! invites just went out. once per match */
export async function invitesSent(matchId: string) {
  if (await getState(`invited:${matchId}`)) return;
  await setState(`invited:${matchId}`, { stamp: new Date().toISOString() });
  const [rows, ts, links] = await Promise.all([getMatchRows(), getTeams(), teamLinks()]);
  const m = rows.find((x) => x.id === matchId);
  if (!m?.team1Id || !m.team2Id) return;
  const name = (id: string) => ts.find((t) => t.id === id)?.name ?? id;
  for (const [mine, opp] of sides(m)) {
    const l = links.get(mine);
    if (l) await chain(`remind:${m.id}:${mine}`, l.channelId, `<@&${l.roleId}> Invites for your match against **${name(opp)}** have been sent in osu!`, "invites", l.roleId);
  }
}

/** #results: role pings + bathbot style embed with match costs. reposts (deleting the old one) when the score changes */
export async function postResult(matchId: string) {
  const { results } = await getCfg();
  if (!results) return;
  const [all, ts, pools, links] = await Promise.all([getMatches(), getTeams(), getPoolStages(), teamLinks()]);
  const m = all.find((x) => x.id === matchId);
  if (!m?.winner || m.team1.score == null || m.team2.score == null) return;
  const stamp = `${m.team1.score}-${m.team2.score}`;
  const key = `result:${m.id}`;
  const prev = await getState(key);
  if (prev?.stamp === stamp) return;
  const sb = await getScoreboard(m, ts, pools).catch(() => null);
  const tag = (id: string) => (links.get(id) ? `<@&${links.get(id)!.roleId}>` : null);
  const { content, embed } = resultMessage(m, sb, tag);
  const roles = [m.team1.id, m.team2.id].flatMap((id) => (links.get(id) ? [links.get(id)!.roleId] : []));
  if (prev?.messageId) await deleteMessage(prev.channelId, prev.messageId).catch(log("delete"));
  const messageId = await post(results, content, { mentions: { roles }, embeds: [embed] });
  await setState(key, { channelId: results, messageId, stamp });
}

const esc = (s: string) => s.replace(/[\\*_~`|[\]<>]/g, "\\$&");
const SQ = ["⬛", "🟥", "🟦"] as const;
const num = (n: number) => n.toLocaleString("en-US");

/** the /results popup as an embed: every counted map with team totals, then match costs. team 1 = red, team 2 = blue */
export function resultMessage(m: Match, sb: Scoreboard | null, tag: (teamId: string) => string | null) {
  const url = `${siteUrl()}/results/${m.id}`;
  const [n1, n2] = [m.team1.name, m.team2.name];
  const maps = (sb?.maps ?? []).filter((x) => x.note !== "warmup" && x.note !== "aborted");
  const lines = maps.map((x) => {
    const slot = x.slot ?? x.mod ?? "—";
    const [a, b] = [num(x.team1), num(x.team2)];
    const bold = (s: string | number, k: 1 | 2) => (x.winner === k ? `**${s}**` : `${s}`);
    const head = `${SQ[x.winner]}  \`${slot}\` [${esc(x.title)}](https://osu.ppy.sh/b/${x.beatmapId}) \\[${esc(x.version)}\\]`;
    const tail =
      x.note === "replayed" ? "-# replayed, not counted" : `-# ${bold(a, 1)} – ${bold(b, 2)}\n-# ${bold(x.running[0], 1)} – ${bold(x.running[1], 2)}`;
    return `${head}\n${tail}`;
  });
  // shortcut: drops whole maps from the end past discord's 4096 description limit, no real match gets close
  let description = "";
  for (const l of lines) if (description.length + l.length + 2 < 4000) description += (description ? "\n\n" : "") + l;
  const costs = sb ? matchCosts(sb, true) : [];
  // bathbot style: top 3 of the whole match get medals, rows are padded code cells
  const medal = new Map([...costs].sort((a, b) => b.cost - a.cost).slice(0, 3).map((c, i) => [c, ["🥇", "🥈", "🥉"][i]]));
  const side = (k: 1 | 2) => {
    const rows = costs.filter((c) => c.team === k).sort((a, b) => b.cost - a.cost);
    const w = Math.max(0, ...rows.map((c) => c.name.length));
    return (
      rows
        .map((c, i) => `\`${i + 1}.\` \`${c.name.replace(/`/g, "'").padEnd(w)}\` \`${c.cost.toFixed(2)}\`${medal.has(c) ? `  ${medal.get(c)}` : ""}`)
        .join("\n") || "—"
    );
  };
  const team = (k: 1 | 2) => ({ name: `${SQ[k]}  ${k === 1 ? n1 : n2}${m.winner === k ? "  🏆" : ""}`, value: side(k) });
  const order: (1 | 2)[] = m.winner === 2 ? [2, 1] : [1, 2];
  const mp = m.links.map((id, i) => `[MP${m.links.length > 1 ? ` ${i + 1}` : ""}](https://osu.ppy.sh/community/matches/${id})`);
  const embed: Embed = {
    author: { name: `BGCC7  ·  ${matchLabel(m.id, m.round)}` },
    title: `${n1}  ${m.team1.score} – ${m.team2.score}  ${n2}`,
    url,
    color: m.winner === 1 ? 0xe0303f : 0x2f6fe0,
    description: description || undefined,
    fields: [
      { name: "​", value: `**Match costs**`, inline: false },
      ...order.map(team),
      { name: "​", value: [`[Full results](${url})`, ...mp].join("  ·  ") },
    ],
    footer: { text: "Match played" },
    timestamp: m.datetime ? new Date(m.datetime).toISOString() : undefined,
  };
  const t1 = tag(m.team1.id) ?? `**${n1}**`;
  const t2 = tag(m.team2.id) ?? `**${n2}**`;
  return { content: `${t1}  **${m.team1.score} – ${m.team2.score}**  ${t2}`, embed };
}

/** mappool channel, @everyone, once per stage */
export async function postPool(stageId: number) {
  const { pool } = await getCfg();
  if (!pool) return;
  const [s] = await db.select({ slug: stages.slug, title: stages.title }).from(stages).where(eq(stages.id, stageId)).limit(1);
  if (!s || (await getState(`pool:${s.slug}`))) return;
  const messageId = await post(pool, `@everyone The **${s.title}** mappool is out: <${siteUrl()}/mappool>`, { mentions: { parse: ["everyone"] } });
  await setState(`pool:${s.slug}`, { channelId: pool, messageId });
}

/** scheduling news in team channels, never pings */
export async function teamNote(texts: Record<string, string>) {
  if (!ready()) return;
  const links = await teamLinks();
  for (const [teamId, text] of Object.entries(texts)) {
    const l = links.get(teamId);
    if (l) await post(l.channelId, text).catch(log("schedule post"));
  }
}

