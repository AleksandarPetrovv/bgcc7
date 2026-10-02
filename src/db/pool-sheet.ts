import "server-only";
import { and, arrayOverlaps, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { poolSuggestions, poolVotes, staff, users } from "./schema";
import { MOD_ORDER, slotOf } from "./mappools";

export type Suggestion = typeof poolSuggestions.$inferSelect & {
  by: string;
  votes: Voter[];
  avg: number | null;
  mine: number | null;
  mineNote: string;
};

export type Voter = { osuId: number; score: number; note: string; username: string; avatar: string | null };
export type Pooler = { osuId: number; username: string; avatar: string | null };

export type SheetSlot = { mod: string; slot: number; label: string; picked: boolean; tie: boolean; items: Suggestion[]; waitingOn: string[]; out: boolean };

const poolers = async () => {
  const rows = await db
    .select({ osuId: staff.osuId, username: users.username, avatar: users.avatarUrl })
    .from(staff)
    .innerJoin(users, eq(users.osuId, staff.osuId))
    .where(arrayOverlaps(staff.permRoles, ["mappooler", "playtester"]));
  return rows;
};

const allIn = (list: { osuId: number; votes: { osuId: number }[] }[], voters: { osuId: number }[]) =>
  voters.length > 0 && list.every((s) => s.votes.length > 0 && voters.every((p) => p.osuId === s.osuId || s.votes.some((v) => v.osuId === p.osuId)));

const tied = (ranked: { avg: number | null }[]) => ranked.length > 1 && ranked[0].avg !== null && Math.abs(ranked[0].avg - (ranked[1].avg ?? -1)) < 1e-9;

const avgOf = (v: { score: number }[]) => (v.length ? v.reduce((n, x) => n + x.score, 0) / v.length : null);

const rank = (a: Suggestion, b: Suggestion) => (b.avg ?? 0) - (a.avg ?? 0) || b.votes.length - a.votes.length || a.createdAt.getTime() - b.createdAt.getTime();

export async function getSheet(stageId: number, viewer: number, blueprint: Record<string, number> = {}) {
  const [rows, voters] = await Promise.all([
    db
      .select({ s: poolSuggestions, by: users.username })
      .from(poolSuggestions)
      .leftJoin(users, eq(users.osuId, poolSuggestions.osuId))
      .where(eq(poolSuggestions.stageId, stageId))
      .orderBy(asc(poolSuggestions.createdAt)),
    poolers(),
  ]);
  const ids = rows.map((r) => r.s.id);
  const votes = ids.length
    ? await db
        .select({ suggestionId: poolVotes.suggestionId, osuId: poolVotes.osuId, score: poolVotes.score, note: poolVotes.note, username: users.username, avatar: users.avatarUrl })
        .from(poolVotes)
        .leftJoin(users, eq(users.osuId, poolVotes.osuId))
        .where(inArray(poolVotes.suggestionId, ids))
    : [];
  const items: Suggestion[] = rows.map(({ s, by }) => {
    const v = votes
      .filter((x) => x.suggestionId === s.id)
      .map(({ osuId, score, note, username, avatar }) => ({ osuId, score, note, username: username ?? `#${osuId}`, avatar }))
      .sort((a, b) => b.score - a.score);
    const me = v.find((x) => x.osuId === viewer);
    return { ...s, by: by ?? `#${s.osuId}`, votes: v, avg: avgOf(v), mine: me?.score ?? null, mineNote: me?.note ?? "" };
  });
  const slots: SheetSlot[] = [];
  for (const mod of MOD_ORDER) {
    const forMod = items.filter((i) => i.mod === mod);
    const count = Math.max(0, Math.floor(blueprint[mod] ?? 0));
    for (const slot of [...new Set([...Array.from({ length: count }, (_, i) => i), ...forMod.map((i) => i.slot)])].sort((a, b) => a - b)) {
      const list = forMod.filter((i) => i.slot === slot).sort((a, b) => Number(b.picked) - Number(a.picked) || rank(a, b));
      const waitingOn = voters.filter((p) => list.some((i) => i.osuId !== p.osuId && !i.votes.some((v) => v.osuId === p.osuId))).map((p) => p.username);
      const picked = list.some((i) => i.picked);
      slots.push({ mod, slot, label: slotOf(mod, slot), picked, tie: !picked && list.length > 0 && allIn(list, voters) && tied(list), items: list, waitingOn, out: slot >= count });
    }
  }
  const owed = items.filter((i) => !i.picked && i.osuId !== viewer && i.mine === null && !slots.find((s) => s.mod === i.mod && s.slot === i.slot)?.picked).length;
  return { slots, voters: voters.map((p) => p.osuId), poolers: voters as Pooler[], owed };
}

export async function slotPicked(stageId: number, mod: string, slot: number) {
  const [row] = await db
    .select({ id: poolSuggestions.id })
    .from(poolSuggestions)
    .where(and(eq(poolSuggestions.stageId, stageId), eq(poolSuggestions.mod, mod), eq(poolSuggestions.slot, slot), eq(poolSuggestions.picked, true)))
    .limit(1);
  return !!row;
}

export async function resolveSlot(stageId: number, mod: string, slot: number, force = false, chosen?: number) {
  if (await slotPicked(stageId, mod, slot)) return null;
  const list = await db
    .select()
    .from(poolSuggestions)
    .where(and(eq(poolSuggestions.stageId, stageId), eq(poolSuggestions.mod, mod), eq(poolSuggestions.slot, slot)));
  if (!list.length) return null;
  const votes = await db
    .select()
    .from(poolVotes)
    .where(
      inArray(
        poolVotes.suggestionId,
        list.map((s) => s.id),
      ),
    );
  const voters = await poolers();
  const ranked = list
    .map((s) => {
      const v = votes.filter((x) => x.suggestionId === s.id);
      return { ...s, by: "", votes: v.map((x) => ({ ...x, username: "", avatar: null })), avg: avgOf(v), mine: null, mineNote: "" };
    })
    .sort(rank);
  const done = allIn(ranked, voters);
  if (!force && (!done || tied(ranked))) return null;
  const win = chosen ? ranked.find((s) => s.id === chosen) : ranked[0];
  if (!win || (!win.votes.length && !force)) return null;
  await db.update(poolSuggestions).set({ picked: true }).where(eq(poolSuggestions.id, win.id));
  return { stageId, mod, slot: slot + 1, title: win.title, version: win.version, avg: win.avg };
}

export async function sheetVersion(stageId: number) {
  const [row] = await db.execute<{ v: string }>(sql`
    select md5(
      coalesce((select string_agg(s.id || ':' || s.picked || ':' || s.osu_id, ',' order by s.id) from pool_suggestions s where s.stage_id = ${stageId}), '') || '|' ||
      coalesce((select string_agg(v.suggestion_id || ':' || v.osu_id || ':' || v.score || ':' || md5(v.note), ',' order by v.suggestion_id, v.osu_id)
        from pool_votes v join pool_suggestions s on s.id = v.suggestion_id where s.stage_id = ${stageId}), '') || '|' ||
      coalesce((select string_agg(st.osu_id || ':' || array_to_string(st.perm_roles, '+'), ',' order by st.osu_id) from staff st), '')
    ) as v`);
  return row?.v ?? "";
}
