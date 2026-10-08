import "server-only";
import { randomInt } from "node:crypto";
import { and, arrayOverlaps, asc, eq, gte, inArray, lte, ne, notLike } from "drizzle-orm";
import { TEST_MATCH } from "@/lib/format";
import { db, db6 } from "./index";
import { drafts, maps, matchCache, matches, pickems, poolSuggestions, poolVotes, registrations, reschedules, scoreEdits, staff, stages, teamMembers, teams, users } from "./schema";
import { advance } from "./bracket";
import { drawSuiji, shuffle } from "./draw";
import { getFormat } from "./edition";
import { getSettings, saveSettings } from "./settings";
import { slotOf } from "./mappools";
import { getPlan, syncStages } from "./format-plan";
import { skillLayout, skillSlot } from "@/lib/format-plan";
import { SCOREBOARD_V, type MapResult, type PlayerLine, type Scoreboard } from "@/lib/scoreboard";
import { presetSections } from "@/lib/sections";
import { resolve, seedingOf } from "@/lib/pickems";
import type { Match } from "@/lib/data";

const FIRST = 1_900_000_001;
const COUNT = 40;
const LAST = FIRST + COUNT - 1;

const NAMES = [
  "Kalin", "mitko_osu", "Vesko77", "Bobby Dimov", "sofia rain", "Plovdiv Kid", "zlatko", "Nikolina", "deyan-", "Raya",
  "Toshko", "Ivo Pr", "Galya", "Krum", "boyan_", "VarnaWave", "Stoyan", "Emiliya", "tsvetomir", "Lyubo",
  "Pesho Gamer", "ani_x", "Rumen", "Desi", "Hristo", "Burgas Night", "Kiril", "Mila", "atanas", "Yoana",
  "Grisha", "Petya", "Nasko", "Tedi", "Valyo", "Rosen", "Bilyana", "Dancho", "Svetla", "Momchil",
];

type Who = { osuId: number; username: string; avatar: string; rank: number };
type PoolMap = typeof maps.$inferSelect;

const MAP_MODS: Record<string, string[]> = { Hidden: ["HD"], HardRock: ["HR"], DoubleTime: ["DT"] };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function line(p: Who, mods: string[]): PlayerLine {
  const skill = Math.max(0, Math.min(1, (Math.log(250_000) - Math.log(p.rank)) / (Math.log(250_000) - Math.log(1500))));
  const acc = Math.min(0.998, rnd(0.9, 0.97) + skill * 0.025);
  const miss = Math.random() < 0.3 ? 0 : randomInt(1, 9);
  return {
    id: p.osuId,
    name: p.username,
    avatar: p.avatar,
    score: Math.round(Math.min(1_100_000, (350_000 + 550_000 * skill) * rnd(0.75, 1.1))),
    acc,
    combo: randomInt(300, 1400),
    miss,
    mods,
    rank: acc > 0.985 && !miss ? "S" : acc > 0.94 ? "A" : "B",
  };
}

function fakeBoard(link: string, names: [string, string], sides: [Who[], Who[]], pool: PoolMap[], ft: number, winner: 1 | 2, lose: number, ez: number, game0: number, label: (mod: string, order: number) => string): Scoreboard {
  const tb = pool.find((m) => m.mod === "Tiebreaker");
  const picks = shuffle(pool.filter((m) => m.mod !== "Tiebreaker"));
  const loser = (3 - winner) as 1 | 2;
  const order = [...shuffle([...Array(ft - 1).fill(winner), ...Array(lose).fill(loser)]), winner] as (1 | 2)[];
  const running: [number, number] = [0, 0];
  const totals = new Map<number, { id: number; name: string; avatar: string; team: 1 | 2; score: number; maps: number; accSum: number }>();
  const out: MapResult[] = order.map((w, i) => {
    const map = i === order.length - 1 && lose === ft - 1 && tb ? tb : picks[i % Math.max(1, picks.length)];
    const fixed = MAP_MODS[map.mod] ?? [];
    const players = sides.map((side) => side.map((p) => line(p, map.mod === "FreeMod" ? (Math.random() < 0.5 ? ["HD"] : Math.random() < 0.5 ? ["HR"] : []) : fixed))) as [PlayerLine[], PlayerLine[]];
    const sum = (k: number) => players[k].reduce((n, p) => n + p.score, 0);
    if (sum(w - 1) <= sum(2 - w)) {
      const f = (sum(w - 1) / Math.max(1, sum(2 - w))) * rnd(0.78, 0.97);
      for (const p of players[2 - w]) p.score = Math.round(p.score * f);
    }
    for (const side of players) side.sort((a, b) => b.score - a.score);
    running[w - 1]++;
    players.forEach((side, k) =>
      side.forEach((p) => {
        const t = totals.get(p.id) ?? { id: p.id, name: p.name, avatar: p.avatar, team: (k + 1) as 1 | 2, score: 0, maps: 0, accSum: 0 };
        t.score += p.score;
        t.maps++;
        t.accSum += p.acc;
        totals.set(p.id, t);
      }),
    );
    return {
      lobby: 0,
      gameId: game0 + i,
      beatmapId: map.beatmapId,
      slot: label(map.mod, map.order),
      mod: map.mod,
      title: map.title,
      artist: map.artist,
      version: map.version,
      cover: map.cover,
      mods: fixed,
      team1: sum(0),
      team2: sum(1),
      winner: w,
      running: [running[0], running[1]],
      players,
      note: null,
    };
  });
  return {
    v: SCOREBOARD_V,
    ez,
    lobbies: [{ id: link, name: `${getFormat().name}: (${names[0]}) vs (${names[1]})` }],
    maps: out,
    score: [running[0], running[1]],
    totals: [...totals.values()].map(({ accSum, ...t }) => ({ ...t, acc: accSum / t.maps })).sort((a, b) => b.score - a.score),
  };
}

const meta = (m: PoolMap) => ({
  beatmapId: m.beatmapId,
  title: m.title,
  artist: m.artist,
  version: m.version,
  creator: m.creator,
  sr: m.sr,
  bpm: m.bpm,
  length: m.length,
  ar: m.ar,
  od: m.od,
  cs: m.cs,
  cover: m.cover,
});

const VOTE_NOTES = ["fits the slot well", "a bit too hard", "too easy for this round", "great pick", "plays fine", "meh", "love this one", "too long", "nice skillset check", "bit generic"];

const day = (iso: string, h: number) => new Date(`${iso}T${String(h).padStart(2, "0")}:00:00+02:00`);
const WEEKS = ["2027-12-04", "2027-12-11", "2027-12-18", "2027-12-25", "2028-01-08"];
const WEEK_OF: Record<string, number> = { "round-of-16": 0, quarterfinals: 1, semifinals: 2, finals: 3, "grand-finals": 4 };

export async function seedTestData() {
  const f = getFormat();
  if (f.edition !== "bgcc7") return null;
  await clearTestData();

  const ranks = Array.from({ length: COUNT }, () => Math.round(Math.exp(Math.log(1500) + Math.random() * (Math.log(250_000) - Math.log(1500))))).sort((a, b) => a - b);
  const people = shuffle(NAMES).map((username, i) => ({
    osuId: FIRST + i,
    username,
    avatarUrl: "https://osu.ppy.sh/images/layout/avatar-guest@2x.png",
    country: "BG",
    seeded: true,
    rank: ranks[i],
    countryRank: i + 1,
    pp: Math.round(14000 * Math.pow(ranks[i], -0.22) * 10) / 10,
    accuracy: 94 + Math.random() * 5,
    badges: i < 6 ? randomInt(0, 4) : 0,
    statsAt: new Date(),
  }));
  await db6.insert(users).values(people).onConflictDoNothing();
  await db.insert(registrations).values(
    people.map((p, i) => ({ osuId: p.osuId, status: i >= COUNT - 2 ? "denied" : i >= COUNT - 4 ? "pending" : "approved", note: i >= COUNT - 2 ? "test" : null, createdAt: new Date(Date.now() - (COUNT - i) * 3_600_000) })),
  );

  const plan = await getPlan();
  await syncStages(plan);
  const src = await db6.select().from(maps).orderBy(asc(maps.id));
  const poolers = await db6.select({ osuId: staff.osuId }).from(staff).where(arrayOverlaps(staff.permRoles, ["mappooler", "playtester"]));
  const mine = await db.select().from(stages).orderBy(asc(stages.order));
  const layouts = Object.fromEntries(plan.rounds.map((r) => [r.slug, skillLayout(plan, r.slug)]));
  for (const [i, st] of mine.entries()) {
    const layout = layouts[st.slug];
    if (!layout) continue;
    const real = await db.select().from(maps).where(and(eq(maps.stageId, st.id), eq(maps.seeded, false)));
    const used = new Set<number>(real.map((m) => m.beatmapId));
    const take = (mod: string) => {
      const m = shuffle(src.filter((x) => !used.has(x.beatmapId))).sort((a, b) => Number(b.mod === mod) - Number(a.mod === mod))[0];
      if (m) used.add(m.beatmapId);
      return m;
    };
    for (const s of layout.groups.flatMap((g) => g.slots)) {
      const set = real.find((m) => m.mod === s.mod && m.order === s.slot);
      const pick = set ?? take(s.mod);
      if (!pick) continue;
      if (!set) await db.insert(maps).values({ ...meta(pick), mod: s.mod, order: s.slot, stageId: st.id, seeded: true });
      if (!poolers.length) continue;
      const rivals = [take(s.mod), Math.random() < 0.5 ? take(s.mod) : undefined].filter((x) => !!x);
      for (const [k, c] of [pick, ...rivals].entries()) {
        const by = poolers[randomInt(poolers.length)].osuId;
        const [row] = await db
          .insert(poolSuggestions)
          .values({ ...meta(c), stageId: st.id, mod: s.mod, slot: s.slot, osuId: by, picked: k === 0, seeded: true })
          .returning({ id: poolSuggestions.id });
        const votes = poolers.filter((p) => p.osuId !== by).map((p) => ({ suggestionId: row.id, osuId: p.osuId, score: k === 0 ? randomInt(7, 11) : randomInt(2, 7), note: VOTE_NOTES[randomInt(VOTE_NOTES.length)] }));
        if (votes.length) await db.insert(poolVotes).values(votes);
      }
    }
    await db.update(stages).set({ poolReleased: i < 3 }).where(eq(stages.id, st.id));
  }

  await drawSuiji();

  const firstTo = new Map(mine.map((s) => [s.slug, layouts[s.slug]?.firstTo ?? s.firstTo ?? f.firstTo]));
  const all = await db.select().from(matches);
  for (const m of all) {
    const w = WEEK_OF[m.stageSlug] ?? 0;
    const k = Number(m.id.match(/M(\d+)$/)?.[1] ?? 1);
    await db.update(matches).set({ startsAt: day(WEEKS[w], 14 + ((k * 2) % 8) + (m.bracket === "losers" ? 1 : 0)) }).where(eq(matches.id, m.id));
  }

  const ts = await db.select({ id: teams.id, seed: teams.seed, name: teams.name }).from(teams);
  const seed = new Map(ts.map((t) => [t.id, t.seed]));
  const teamName = new Map(ts.map((t) => [t.id, t.name]));
  const members = await db.select({ teamId: teamMembers.teamId, osuId: teamMembers.osuId }).from(teamMembers);
  const who = new Map(people.map((p) => [p.osuId, { osuId: p.osuId, username: p.username, avatar: p.avatarUrl, rank: p.rank }]));
  const roster = (teamId: string) => members.filter((m) => m.teamId === teamId).flatMap((m) => who.get(m.osuId) ?? []);
  const pools = await db.select().from(maps);
  const stageId = new Map(mine.map((s) => [s.slug, s.id]));
  const { ezMult } = await getSettings();
  const played = f.order.filter((id) => /^(WB|LB)-R[12]-/.test(id));
  for (const id of played) {
    const [m] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    if (!m?.team1Id || !m.team2Id) continue;
    const ft = firstTo.get(m.stageSlug) ?? f.firstTo;
    const s1 = seed.get(m.team1Id) ?? 8;
    const s2 = seed.get(m.team2Id) ?? 8;
    const one = Math.random() < s2 / (s1 + s2);
    const lose = randomInt(0, ft);
    const pool = pools.filter((x) => x.stageId === stageId.get(m.stageSlug));
    const n = played.indexOf(id);
    const link = String(990_000_000 + n);
    if (pool.length) {
      const data = fakeBoard(link, [teamName.get(m.team1Id) ?? "", teamName.get(m.team2Id) ?? ""], [roster(m.team1Id), roster(m.team2Id)], pool, ft, one ? 1 : 2, lose, ezMult, 900_000_000 + n * 100, (mod, order) => skillSlot(layouts[m.stageSlug], mod, order)?.label ?? slotOf(mod, order));
      await db.insert(matchCache).values({ matchId: id, links: link, data });
    }
    await db
      .update(matches)
      .set({ score1: one ? ft : lose, score2: one ? lose : ft, winner: one ? 1 : 2, mpLinks: pool.length ? link : "" })
      .where(eq(matches.id, id));
    await advance();
  }

  const rows = await db.select().from(matches);
  const ms = rows.map((m): Match => ({
    id: m.id,
    datetime: null,
    team1: { id: m.team1Id ?? "", name: "", score: m.score1 },
    team2: { id: m.team2Id ?? "", name: "", score: m.score2 },
    winner: m.winner === 1 || m.winner === 2 ? m.winner : null,
    links: [],
    round: m.round,
    bracket: m.bracket as Match["bracket"],
    stage: m.stageSlug,
    referee: null,
    streamer: null,
    commentators: null,
    vodUrl: null,
  }));
  const seeding = seedingOf(ms);
  for (const p of people.slice(0, 14)) {
    let picks: Record<string, string> = {};
    for (const id of f.order) {
      const { slots } = resolve(f, picks, seeding);
      const [a, b] = slots[id] ?? [null, null];
      if (a && b) picks = resolve(f, { ...picks, [id]: Math.random() < 0.6 ? a : b }, seeding).picks;
    }
    await db.insert(pickems).values({ osuId: p.osuId, picks });
  }

  await saveSettings({ phase: "playoffs", sections: presetSections("playoffs"), pickemsOpen: false });
  return { players: COUNT };
}

export async function clearTestData() {
  if (getFormat().edition !== "bgcc7") return null;
  const touched = [...new Set((await db.select({ id: maps.stageId }).from(maps).where(eq(maps.seeded, true))).map((m) => m.id))];
  await db.transaction(async (tx) => {
    await tx.delete(pickems);
    await tx.delete(drafts);
    await tx.delete(matchCache);
    await tx.delete(scoreEdits);
    await tx.delete(reschedules);
    await tx.update(matches).set({ team1Id: null, team2Id: null, score1: null, score2: null, winner: null, startsAt: null, mpLinks: "", referee: null, streamer: null, commentators: null, vodUrl: null, manual: false }).where(ne(matches.id, TEST_MATCH.id));
    await tx.delete(teams).where(notLike(teams.id, "test-%"));
    await tx.delete(maps).where(eq(maps.seeded, true));
    await tx.delete(poolSuggestions).where(eq(poolSuggestions.seeded, true));
    if (touched.length) await tx.update(stages).set({ poolReleased: false }).where(inArray(stages.id, touched));
    await tx.delete(registrations).where(and(gte(registrations.osuId, FIRST), lte(registrations.osuId, LAST)));
  });
  await saveSettings({ phase: "registration", sections: presetSections("registration"), pickemsOpen: false });
  const ids = Array.from({ length: COUNT }, (_, i) => FIRST + i);
  await db6.delete(users).where(inArray(users.osuId, ids));
  return { cleared: true };
}
