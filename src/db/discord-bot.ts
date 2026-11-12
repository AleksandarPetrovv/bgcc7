import "server-only";
import { and, arrayContains, eq, inArray, isNotNull, like, not, sql } from "drizzle-orm";
import { currentEdition, db, detached, isBGCC6, withEdition } from "./index";
import { discordState, discordTeams, drafts, staff, users } from "./schema";
import { getMatchRows, getMatches, getTeams, type MatchRow } from "./tournament";
import { getPoolStages, poolGaps } from "./mappools";
import { getScoreboard } from "./scoreboards";
import { getFormat } from "./edition";
import { siteUrl } from "@/lib/links";
import { notifyCaptain, schedulable, weekFinder } from "./schedule";
import type { Week } from "@/lib/schedule";
import { deadlineSoonMessage, matchLabel, noRefMessage, poolClosedMessage, poolMessage, poolOpenMessage, poolReminderMessage, commentMessage, refAssignedMessage, refRemovedMessage, resultMessage, rolesGivenMessage, rolesTakenMessage, staffTimeMessage, streamMessage, walkoverMessage, when, yourTeamMessage } from "@/lib/discord-text";
import { walkoverOf } from "@/lib/out";
import { getSkillLayouts } from "./format-plan";
import { MODS, MOD_ORDER } from "@/lib/mods";
import { addRole, botUser, createChannel, createRole, moveRoles, deleteChannel, deleteMessage, deleteRole, discordReady, dm, editChannel, editRole, guildChannels, guildId, guildRoles, memberRoles, post, removeRole, type Overwrite } from "@/lib/discord";
import { staffNames } from "@/lib/staff-names";
import { ROLES, type Role } from "@/lib/roles";
import { dicts } from "@/lib/i18n/dict";
import { globalStore } from "@/lib/global-store";

const ready = () => discordReady() && !isBGCC6();
const log = (what: string) => (e: unknown) => console.error(`[discord] ${what}`, e);

export const later = (what: string, fn: () => Promise<unknown>) => {
  if (ready()) detached(`discord ${what}`, fn);
};


type State = { channelId: string; messageId: string; stamp: string };
const getState = async (key: string) => (await db.select().from(discordState).where(eq(discordState.key, key)).limit(1))[0] ?? null;
const setState = (key: string, v: Partial<State>) =>
  db.insert(discordState).values({ key, ...v, updatedAt: new Date() }).onConflictDoUpdate({ target: discordState.key, set: { ...v, updatedAt: new Date() } });

export type DiscordCfg = { results: string; pool: string; hosts: string; staff: string; mappooling: string };
export async function getCfg(): Promise<DiscordCfg> {
  const rows = await db.select().from(discordState).where(like(discordState.key, "cfg:%"));
  const v = (k: string) => rows.find((r) => r.key === `cfg:${k}`)?.channelId ?? "";
  return { results: v("results"), pool: v("pool"), hosts: v("hosts"), staff: v("staff"), mappooling: v("mappooling") };
}
export const setCfg = (k: keyof DiscordCfg, channelId: string) => setState(`cfg:${k}`, { channelId });


const VIEW = 1 << 10;
const SEND = 1 << 11;
const HISTORY = 1 << 16;
const CONNECT = 1 << 20;
const SPEAK = 1 << 21;
const bits = (...p: number[]) => String(p.reduce((a, b) => a | b, 0));
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "team";

const dc = globalStore<{ sync?: Promise<void>; synced?: number; checked?: number }>("bgccDc", () => ({}));

export function syncTeams() {
  if (!ready()) return Promise.resolve();
  const ed = currentEdition();
  dc.sync = (dc.sync ?? Promise.resolve()).then(() => withEdition(ed, runSync)).catch(log("sync"));
  return dc.sync;
}

type TeamRow = typeof discordTeams.$inferSelect;
const dropTeam = async (r: TeamRow) => {
  for (const id of [r.channelId, r.voiceId, r.categoryId]) if (id) await deleteChannel(id);
  await deleteRole(r.roleId);
};

const staffRoleName = (r: Role) => dicts.en.admin.roles[r];
// discord takes colours as numbers, so these can't come from palette.css
const STAFF_COLOR: Record<Role, number> = { host: 0xc2577f, technical: 0x4fa3a5, leadDesign: 0xd46a9f, referee: 0x5b8def, mappooler: 0x7fa34a, playtester: 0x11806a, streamer: 0x9b6bf2, commentator: 0xe0a030, designer: 0xe58fb1 };

// the staff section: who sees each channel besides hosts (who see all of it). found by name, made when missing
const STAFF_CATEGORY = "Staff";
const STAFF_CHANNELS: { name: string; type: 0 | 2; roles: readonly Role[]; cfg?: keyof DiscordCfg }[] = [
  { name: "staff", type: 0, roles: ROLES, cfg: "staff" },
  { name: "hosts", type: 0, roles: [], cfg: "hosts" },
  { name: "referees", type: 0, roles: ["referee"] },
  { name: "streamers", type: 0, roles: ["streamer"] },
  { name: "mappooling", type: 0, roles: ["mappooler", "playtester"], cfg: "mappooling" },
  { name: "Staff", type: 2, roles: ROLES },
  { name: "Casting", type: 2, roles: ["commentator"] },
];

type Chan = Awaited<ReturnType<typeof guildChannels>>[number];
const sameAccess = (c: Chan | undefined, want: Overwrite[]) => {
  const key = (o: Overwrite) => `${o.id}:${o.allow ?? "0"}:${o.deny ?? "0"}`;
  return !!c && [...(c.permission_overwrites ?? [])].map(key).sort().join() === want.map(key).sort().join();
};

async function syncStaffChannels(chans: Chan[], staffRoles: Map<Role, string>, hidden: Overwrite, bot: Overwrite, open: string) {
  const access = (roles: readonly Role[]): Overwrite[] => [hidden, bot, ...[...new Set<Role>(["host", ...roles])].map((r) => ({ id: staffRoles.get(r)!, type: 0 as const, allow: open }))];
  const find = (name: string, type: number) => chans.find((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase());
  const cat = find(STAFF_CATEGORY, 4) ?? (await createChannel(STAFF_CATEGORY, 4, access(ROLES)));
  const cfg = await getCfg();
  for (const ch of STAFF_CHANNELS) {
    const want = access(ch.roles);
    const have = find(ch.name, ch.type);
    const id = have?.id ?? (await createChannel(ch.name, ch.type, want, cat.id)).id;
    if (have && !sameAccess(have, want)) await editChannel(id, { permission_overwrites: want });
    if (ch.cfg && !cfg[ch.cfg]) await setCfg(ch.cfg, id);
  }
}

async function runSync() {
  const [ts, rows, roles, chans, me] = await Promise.all([getTeams(), db.select().from(discordTeams), guildRoles(), guildChannels(), botUser()]);
  const hidden: Overwrite = { id: guildId(), type: 0, deny: bits(VIEW) };
  const open = bits(VIEW, SEND, HISTORY, CONNECT, SPEAK);
  const bot: Overwrite = { id: me.id, type: 1, allow: open };
  // one discord role per site staff role, found by name or created (coloured, shown apart in the member list)
  const staffRoles = new Map<Role, string>();
  const made: string[] = [];
  for (const r of ROLES) {
    const found = roles.find((x) => x.name.toLowerCase() === staffRoleName(r).toLowerCase());
    const id = found?.id ?? (await createRole(staffRoleName(r), { color: STAFF_COLOR[r], hoist: true })).id;
    if (!found) made.push(id);
    staffRoles.set(r, id);
  }
  // discord puts a new role at the very bottom: staff roles sit together above everything else the bot can move, in the order they already have
  const live = made.length ? await guildRoles() : roles;
  const staffIds = new Set(staffRoles.values());
  const mine = new Set(await memberRoles(me.id));
  const top = Math.max(0, ...live.filter((r) => mine.has(r.id)).map((r) => r.position));
  const below = live.filter((r) => r.position < top && r.id !== guildId() && !r.managed).sort((a, b) => b.position - a.position);
  const [up, rest] = [below.filter((r) => staffIds.has(r.id)), below.filter((r) => !staffIds.has(r.id))];
  if (up.length && rest.length && up.at(-1)!.position <= rest[0].position) {
    // nothing may reach the bot's own position, so the tail shares the lowest one
    await moveRoles([...up, ...rest].map((r, i) => ({ id: r.id, position: Math.max(1, top - 1 - i) }))).catch(log("role order"));
  }
  await syncStaffChannels(chans, staffRoles, hidden, bot, open).catch(log("staff channels"));
  // hosts + refs see every team section
  const seers: Overwrite[] = (["host", "referee"] as const).map((r) => ({ id: staffRoles.get(r)!, type: 0, allow: open }));
  const perms = (roleId: string): Overwrite[] => [hidden, { id: roleId, type: 0, allow: open }, ...seers, bot];
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  const chanName = new Map(chans.map((c) => [c.id, c.name]));
  const ids = new Set(ts.map((t) => t.id));
  const have = new Map<string, TeamRow>();
  for (const r of rows) {
    if (!ids.has(r.teamId) || !roleName.has(r.roleId) || !chanName.has(r.channelId)) {
      await dropTeam(r);
      await db.delete(discordTeams).where(eq(discordTeams.teamId, r.teamId));
    } else have.set(r.teamId, r);
  }
  const save = async (row: TeamRow) => {
    await db.insert(discordTeams).values(row).onConflictDoUpdate({ target: discordTeams.teamId, set: row });
    have.set(row.teamId, row);
  };
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
  const linked = new Map((await db.select({ osuId: users.osuId, discordId: users.discordId }).from(users).where(isNotNull(users.discordId))).map((u) => [u.osuId, u.discordId!]));
  const want = new Map<string, string>();
  // a team that is out keeps its section but its players lose the role
  for (const t of ts.filter((t) => !t.out))
    for (const p of t.players) {
      const d = linked.get(p.userId);
      const r = have.get(t.id);
      if (d && r) want.set(d, r.roleId);
    }
  const ours = new Set([...have.values()].map((r) => r.roleId));
  const held = new Map<string, Set<string>>();
  for (const s of await db.select({ osuId: staff.osuId, permRoles: staff.permRoles }).from(staff)) {
    const d = linked.get(s.osuId);
    if (d) held.set(d, new Set(s.permRoles.flatMap((r) => staffRoles.get(r as Role) ?? [])));
  }
  // only linked users are checked here (so a removed staff member loses their roles); unlink/relink strips the old account first (dropTeamRoles)
  for (const d of new Set(linked.values())) {
    const mine = await memberRoles(d);
    if (!mine) continue;
    const w = want.get(d);
    for (const rid of mine) if (ours.has(rid) && rid !== w) await removeRole(d, rid);
    if (w && !mine.includes(w)) await addRole(d, w);
    for (const rid of staffRoles.values()) if ((held.get(d)?.has(rid) ?? false) !== mine.includes(rid)) await (mine.includes(rid) ? removeRole : addRole)(d, rid).catch(log("staff role")); // a role above the bot's own can't be managed: the team sync must still finish
  }
}

export async function dropTeamRoles(discordId: string) {
  const ours = new Set((await db.select({ r: discordTeams.roleId }).from(discordTeams)).map((x) => x.r));
  // an unlinked account keeps no staff role either
  const names = new Set(ROLES.map((r) => staffRoleName(r).toLowerCase()));
  for (const r of await guildRoles()) if (names.has(r.name.toLowerCase())) ours.add(r.id);
  for (const rid of (await memberRoles(discordId)) ?? []) if (ours.has(rid)) await removeRole(discordId, rid);
}

export async function cleanupDiscord() {
  if (!ready()) return;
  await dc.sync;
  for (const r of await db.select().from(discordTeams)) await dropTeam(r);
  await db.delete(discordTeams);
  await db.delete(discordState).where(not(inArray(discordState.key, ["cfg:results", "cfg:pool", "cfg:hosts", "cfg:staff", "cfg:mappooling"])));
}


const teamLinks = async () => new Map((await db.select().from(discordTeams)).map((r) => [r.teamId, r]));
const ping = (roleId: string) => ({ roles: [roleId] });

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

export async function tick() {
  await checkResults().catch(log("result check"));
  if (!ready()) return;
  // shortcut: team edits/draws reach discord through this 5 min resync instead of hooks in every admin team action
  if (Date.now() - (dc.synced ?? 0) > 5 * 60_000) {
    dc.synced = Date.now();
    await syncTeams();
  }
  const [rows, ts, links] = await Promise.all([getMatchRows(), getTeams(), teamLinks()]);
  const name = namer(ts);
  const now = Date.now();
  await postWalkovers(rows, links, name).catch(log("walkover"));
  await noRefNotices(rows, name).catch(log("no referee"));
  await deadlineNotices(rows, name).catch(log("deadline"));
  await refAssignments(rows, name).catch(log("ref assigned"));
  await streamNotices(rows, name).catch(log("stream notice"));
  await roleNotices().catch(log("role notice"));
  for (const m of rows) {
    if (!m.startsAt || m.winner != null || !m.team1Id || !m.team2Id) continue;
    const left = m.startsAt.getTime() - now;
    if (left <= 0 || left > 35 * 60_000) continue;
    const start = m.startsAt.toISOString();
    await refDm(m, name).catch(log("ref dm"));
    if ((await getState(`invited:${m.id}`))?.stamp === start) continue;
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

type Names = (id: string | null) => string;
const namer = (ts: { id: string; name: string }[]): Names => (id) => (id ? (ts.find((t) => t.id === id)?.name ?? id) : "TBD");
const STEPS = [180, 120, 60, 30, 10];
const nameList = (field: string | null) => [...new Set(staffNames(field).map((x) => x.toLowerCase()))].sort();
const upcoming = (m: MatchRow) => m.winner == null && m.ffSide == null && !!m.team1Id && !!m.team2Id && !!m.startsAt && m.startsAt.getTime() > Date.now();

const discordIds = async (names: string[]) =>
  names.length ? (await db.select({ id: users.discordId }).from(users).where(and(inArray(sql`lower(${users.username})`, names), isNotNull(users.discordId)))).map((r) => r.id!) : [];

async function refLink(matchId: string) {
  const [d] = await db.select({ open: drafts.open }).from(drafts).where(eq(drafts.matchId, matchId)).limit(1);
  return d?.open ? `Pick and ban page: <${siteUrl()}/matches/${matchId}>` : `Open it from the admin pick and ban page: <${siteUrl()}/admin/draft>`;
}

async function refDm(m: MatchRow, name: Names) {
  const names = nameList(m.referee);
  if (!names.length) return;
  const key = `ref:${m.id}`;
  const stamp = `${m.startsAt!.toISOString()}|${names.join(",")}`;
  if ((await getState(key))?.stamp === stamp) return;
  const text = `You're reffing **${name(m.team1Id)} vs ${name(m.team2Id)}** (${matchLabel(getFormat(), m.id, m.round)}) at **${when(m.startsAt!)}**. ${await refLink(m.id)}`;
  for (const id of await discordIds(names)) await dm(id, text).catch(log("ref dm"));
  await setState(key, { stamp });
}

const hostRole = async () => (await guildRoles()).find((r) => r.name.toLowerCase() === "host");

/** captains get one DM in the last 24h before a scheduling deadline with no agreed time; the hosts' bell and channel hear once when it passed. `deadline:` stamps are the deadline, so a moved week starts over */
async function deadlineNotices(rows: MatchRow[], name: Names) {
  const weekAt = await weekFinder();
  const now = Date.now();
  const due: { m: MatchRow; w: Week; late: boolean; key: string }[] = [];
  for (const m of rows) {
    const w = schedulable(m) && !m.startsAt ? weekAt(m.id) : null;
    if (!w) continue;
    const left = w.deadline.getTime() - now;
    const late = left <= 0;
    if (!late && left > 24 * 36e5) continue;
    const key = `${late ? "deadline-late" : "deadline-soon"}:${m.id}`;
    if ((await getState(key))?.stamp !== w.deadline.toISOString()) due.push({ m, w, late, key });
  }
  if (!due.length) return;
  const role = await hostRole();
  for (const { m, w, late, key } of due) {
    const label = matchLabel(getFormat(), m.id, m.round);
    if (late) {
      const { notifyHosts } = await import("./host-notes");
      await notifyHosts({ title: dicts.en.admin.deadlineMissed(label, name(m.team1Id), name(m.team2Id), when(w.deadline)), href: "/admin/scheduling", pingRole: role?.id }).catch(log("deadline post"));
    } else for (const [mine, opp] of sides(m)) await notifyCaptain(mine, (link) => deadlineSoonMessage(label, name(opp), w.deadline, link)).catch(log("deadline dm"));
    await setState(key, { stamp: w.deadline.toISOString() });
  }
}

/** hosts channel (pinged) + host DMs at 3h/2h/1h/30m/10m; only the latest step passed is sent, a new start time starts over */
async function noRefNotices(rows: MatchRow[], name: Names) {
  const due: { m: MatchRow; step: number; key: string; start: string }[] = [];
  for (const m of rows) {
    if (!upcoming(m) || staffNames(m.referee).length) continue;
    const left = (m.startsAt!.getTime() - Date.now()) / 60_000;
    const step = STEPS.filter((s) => left <= s).at(-1);
    if (!step) continue;
    const key = `noref:${m.id}`;
    const start = m.startsAt!.toISOString();
    const [at, last] = (await getState(key))?.stamp?.split("|") ?? [];
    if (at !== start || +last > step) due.push({ m, step, key, start });
  }
  if (!due.length) return;
  const [{ hosts }, role, hostIds] = await Promise.all([
    getCfg(),
    hostRole(),
    db.select({ id: users.discordId }).from(staff).innerJoin(users, eq(users.osuId, staff.osuId)).where(and(arrayContains(staff.permRoles, ["host"]), isNotNull(users.discordId))),
  ]);
  for (const { m, step, key, start } of due) {
    const text = (ping: string) => noRefMessage(ping, matchLabel(getFormat(), m.id, m.round), name(m.team1Id), name(m.team2Id), step, m.startsAt!);
    if (hosts) await post(hosts, text(role ? `<@&${role.id}>` : ""), { mentions: role ? ping(role.id) : undefined }).catch(log("no referee post"));
    for (const h of hostIds) await dm(h.id!, text("")).catch(log("no referee dm"));
    await setState(key, { stamp: `${start}|${step}` });
  }
}

/** DMs a referee who was added to or dropped from a match; `refs:<id>` holds the sorted lowercase names as JSON. the first run only records */
async function refAssignments(rows: MatchRow[], name: Names) {
  const prev = new Map((await db.select().from(discordState).where(like(discordState.key, "refs:%"))).map((r) => [r.key, r.stamp]));
  const first = prev.size === 0;
  for (const m of rows) {
    if (m.winner != null || m.ffSide != null) continue;
    const names = nameList(m.referee);
    const key = `refs:${m.id}`;
    const stamp = JSON.stringify(names);
    if (prev.get(key) === stamp) continue;
    const before: string[] = JSON.parse(prev.get(key) ?? "[]");
    const [added, removed] = first ? [[], []] : await Promise.all([discordIds(names.filter((n) => !before.includes(n))), discordIds(before.filter((n) => !names.includes(n)))]);
    const label = matchLabel(getFormat(), m.id, m.round);
    if (added.length) {
      const text = refAssignedMessage(label, name(m.team1Id), name(m.team2Id), m.startsAt, await refLink(m.id));
      for (const id of added) await dm(id, text).catch(log("ref assigned dm"));
    }
    for (const id of removed) await dm(id, refRemovedMessage(label, name(m.team1Id), name(m.team2Id))).catch(log("ref removed dm"));
    await setState(key, { stamp });
  }
}

/** one DM to each streamer and commentator within the hour before start; `stream:<id>` / `comm:<id>` stamp = start|names */
async function streamNotices(rows: MatchRow[], name: Names) {
  for (const m of rows) {
    if (!upcoming(m) || m.startsAt!.getTime() - Date.now() > 60 * 60_000) continue;
    const args = [matchLabel(getFormat(), m.id, m.round), name(m.team1Id), name(m.team2Id), m.startsAt!] as const;
    const jobs = [
      ["stream", m.streamer, streamMessage(...args, `<${siteUrl()}/admin/stream>`)],
      ["comm", m.commentators, commentMessage(...args, `<${siteUrl()}/matches/${m.id}>`)],
    ] as const;
    for (const [prefix, field, text] of jobs) {
      const names = nameList(field);
      if (!names.length) continue;
      const key = `${prefix}:${m.id}`;
      const stamp = `${m.startsAt!.toISOString()}|${names.join(",")}`;
      if ((await getState(key))?.stamp === stamp) continue;
      for (const id of await discordIds(names)) await dm(id, text).catch(log(`${prefix} dm`));
      await setState(key, { stamp });
    }
  }
}

/** everyone on the match hears its new time at once, whatever the hour; detached so the admin action never waits */
export const dmStaffTime = (matchId: string, at: Date) =>
  later("staff time dm", async () => {
    const [rows, ts] = await Promise.all([getMatchRows(), getTeams()]);
    const m = rows.find((x) => x.id === matchId);
    if (!m) return;
    const name = namer(ts);
    const text = staffTimeMessage(matchLabel(getFormat(), m.id, m.round), name(m.team1Id), name(m.team2Id), at);
    for (const id of await discordIds([...new Set([m.referee, m.streamer, m.commentators].flatMap(nameList))])) await dm(id, text).catch(log("staff time dm"));
  });

/** `told:<osuId>` holds the staff roles that person was last told about (JSON in stamp). a DM with the difference goes out once their discord is linked; state moves only after a DM landed.
 *  the first run only records, so existing staff aren't all told at once */
export async function roleNotices() {
  const [rows, told, links] = await Promise.all([
    db.select({ osuId: staff.osuId, permRoles: staff.permRoles }).from(staff),
    db.select().from(discordState).where(like(discordState.key, "told:%")),
    db.select({ osuId: users.osuId, id: users.discordId }).from(users).where(isNotNull(users.discordId)),
  ]);
  const now = new Map(rows.map((s) => [s.osuId, ROLES.filter((r) => s.permRoles.includes(r))]));
  const was = new Map(told.map((r) => [Number(r.key.slice(5)), JSON.parse(r.stamp || "[]") as Role[]]));
  const save = (osuId: number, roles: Role[]) => setState(`told:${osuId}`, { stamp: JSON.stringify(roles) });
  if (!was.size) {
    for (const [osuId, roles] of now) await save(osuId, roles);
    return;
  }
  const discord = new Map(links.map((u) => [u.osuId, u.id!]));
  const tournament = getFormat().name;
  for (const osuId of new Set([...now.keys(), ...was.keys()])) {
    const cur = now.get(osuId) ?? [];
    let known = was.get(osuId) ?? [];
    const given = cur.filter((r) => !known.includes(r));
    const taken = known.filter((r) => !cur.includes(r));
    const d = discord.get(osuId);
    if (!d || (!given.length && !taken.length)) continue;
    try {
      if (given.length) {
        await dm(d, rolesGivenMessage(tournament, given));
        known = [...known, ...given];
        await save(osuId, known);
      }
      if (taken.length) await dm(d, rolesTakenMessage(tournament, taken));
      await save(osuId, cur);
    } catch (e) {
      log("role dm")(e);
    }
  }
}

/** every 5 min: reading a scoreboard settles a decided match, so unopened matches still finish. runs without discord configured */
async function checkResults() {
  if (Date.now() - (dc.checked ?? 0) < 5 * 60_000) return;
  dc.checked = Date.now();
  const [all, rows, ts, pools] = await Promise.all([getMatches(), getMatchRows(), getTeams(), getPoolStages()]);
  const walkovers = new Set(rows.filter((r) => r.ffSide != null).map((r) => r.id));
  for (const m of all) if (m.links.length && !m.winner && !walkovers.has(m.id)) await getScoreboard(m, ts, pools).catch(log(`result check ${m.id}`));
}

export async function invitesSent(matchId: string) {
  const [rows, ts, links] = await Promise.all([getMatchRows(), getTeams(), teamLinks()]);
  const m = rows.find((x) => x.id === matchId);
  if (!m?.team1Id || !m.team2Id) return;
  const start = m.startsAt?.toISOString() ?? "none";
  if ((await getState(`invited:${matchId}`))?.stamp === start) return;
  await setState(`invited:${matchId}`, { stamp: start });
  const name = (id: string) => ts.find((t) => t.id === id)?.name ?? id;
  for (const [mine, opp] of sides(m)) {
    const l = links.get(mine);
    if (l) await chain(`remind:${m.id}:${mine}`, l.channelId, `<@&${l.roleId}> Invites for your match against **${name(opp)}** have been sent in osu!`, "invites", l.roleId);
  }
}

/** #results: a walkover is announced once its agreed start time has come; one without a time stays silent */
async function postWalkovers(rows: MatchRow[], links: Map<string, { roleId: string }>, name: (id: string) => string) {
  const { results } = await getCfg();
  if (!results) return;
  for (const m of rows) {
    const ff = walkoverOf(m);
    if (!ff || m.winner == null || !m.team1Id || !m.team2Id || !m.startsAt || m.startsAt.getTime() > Date.now()) continue;
    const key = `walkover:${m.id}`;
    if (await getState(key)) continue;
    const [gone, on] = ff.side === 1 ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    const tag = (id: string) => (links.get(id) ? `<@&${links.get(id)!.roleId}>` : `**${name(id)}**`);
    const messageId = await post(results, walkoverMessage(tag(on), tag(gone), ff.kind), { mentions: { roles: [on, gone].flatMap((id) => (links.get(id) ? [links.get(id)!.roleId] : [])) } });
    await setState(key, { channelId: results, messageId, stamp: ff.kind });
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
  const { content, embed } = resultMessage(getFormat(), m, sb, tag);
  const roles = [m.team1.id, m.team2.id].flatMap((id) => (links.get(id) ? [links.get(id)!.roleId] : []));
  if (prev?.messageId) await deleteMessage(prev.channelId, prev.messageId).catch(log("delete"));
  const messageId = await post(results, content, { mentions: { roles }, embeds: [embed] });
  await setState(key, { channelId: results, messageId, stamp });
}

/** #staff: once per window, pings the mappooler and playtester roles that pooling for the round has started */
export async function postPoolOpen(slug: string, title: string, closes: Date) {
  const { staff: channel } = await getCfg();
  const key = `poolopen:${slug}`;
  if (!channel || (await getState(key))) return;
  const ids = await roleIds(["mappooler", "playtester"]);
  const messageId = await post(channel, poolOpenMessage(ids.map((id) => `<@&${id}>`), title, closes, `${siteUrl()}/admin/mappools/sheet`), { mentions: { roles: ids } });
  await setState(key, { channelId: channel, messageId });
}

const roleIds = async (names: string[]) => (await guildRoles()).filter((r) => names.includes(r.name.toLowerCase())).map((r) => r.id);

/** #staff: once per window, 24 hours before it closes; a moved window gets it again only while its new close is still 23h+ away */
export async function postPoolReminder(slug: string, title: string, closes: Date) {
  const { staff: channel } = await getCfg();
  const key = `poolremind:${slug}`;
  const stamp = String(closes.getTime());
  const prev = await getState(key);
  if (!channel || prev?.stamp === stamp || (prev && closes.getTime() - Date.now() < 23 * 3600_000)) return;
  const ids = await roleIds(["mappooler", "playtester"]);
  const messageId = await post(channel, poolReminderMessage(ids.map((id) => `<@&${id}>`), title), { mentions: { roles: ids } });
  await setState(key, { channelId: channel, messageId, stamp });
}

/** #mappooling: once per stage, tells the mappoolers the window closed and the leading maps went in */
export async function postPoolClosed(slug: string, title: string) {
  const { mappooling: channel } = await getCfg();
  const key = `poolclosed:${slug}`;
  if (!channel || (await getState(key))) return;
  const ids = await roleIds(["mappooler"]);
  const messageId = await post(channel, poolClosedMessage(ids.map((id) => `<@&${id}>`), title), { mentions: { roles: ids } });
  await setState(key, { channelId: channel, messageId });
}

/** the @everyone release post, once per stage, and only for a released pool that is complete and has its pack */
export async function postPool(stageId: number) {
  const { pool } = await getCfg();
  if (!pool) return;
  const [s, layouts, gaps] = await Promise.all([getPoolStages().then((all) => all.find((x) => x.id === stageId)), getSkillLayouts(), poolGaps(stageId)]);
  if (!s || !s.released || !gaps?.ok || (await getState(`pool:${s.slug}`))) return;
  const map = (mod: string, slot: number) => s.pools.find((p) => p.category === mod)?.maps.find((m) => m.order === slot);
  const layout = layouts?.[s.slug];
  const sections = layout
    ? layout.groups.map((g) => ({ name: g.name, maps: g.slots.flatMap((x) => map(x.mod, x.slot) ?? []) }))
    : MOD_ORDER.map((mod) => ({ name: MODS[mod].label, maps: [...(s.pools.find((p) => p.category === mod)?.maps ?? [])].sort((a, b) => a.order - b.order) }));
  const { content, embed } = poolMessage(getFormat(), { slug: s.slug, title: s.title, firstTo: s.firstTo }, sections);
  const messageId = await post(pool, content, { mentions: { parse: ["everyone"] }, embeds: [embed] });
  await setState(`pool:${s.slug}`, { channelId: pool, messageId });
}

/** English DM to a player with a linked discord; detached, so it never throws into the caller */
export const dmPlayer = (osuId: number, text: string) =>
  later("player dm", async () => {
    const [u] = await db.select({ id: users.discordId }).from(users).where(eq(users.osuId, osuId)).limit(1);
    if (u?.id) await dm(u.id, text).catch(log("player dm"));
  });

/** every linked player hears their team and teammate once; `team:<osuId>` holds teamId|mateId, so only players whose team changed hear again */
export const announceTeams = () =>
  later("team announce", async () => {
    const [ts, linked] = await Promise.all([getTeams(), db.select({ osuId: users.osuId, id: users.discordId }).from(users).where(isNotNull(users.discordId))]);
    const byOsu = new Map(linked.map((u) => [u.osuId, u.id!]));
    for (const t of ts)
      for (const p of t.players) {
        const id = byOsu.get(p.userId);
        const mate = t.players.find((x) => x.userId !== p.userId);
        const stamp = `${t.id}|${mate?.userId ?? ""}`;
        if (!id || (await getState(`team:${p.userId}`))?.stamp === stamp) continue;
        await dm(id, yourTeamMessage(getFormat().name, t.name, mate?.username ?? null)).catch(log("team dm"));
        await setState(`team:${p.userId}`, { stamp });
      }
  });

/** scheduling news in team channels, never pings */
export async function teamNote(texts: Record<string, string>) {
  if (!ready()) return;
  const links = await teamLinks();
  for (const [teamId, text] of Object.entries(texts)) {
    const l = links.get(teamId);
    if (l) await post(l.channelId, text).catch(log("schedule post"));
  }
}

