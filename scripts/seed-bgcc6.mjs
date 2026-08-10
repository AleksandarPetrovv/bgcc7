import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { lobbies, lobbyBookings, maps, qualScores, registrations, stages, staff, users } from "../src/db/schema.ts";
import mappoolsJson from "../src/data/mappools.json" with { type: "json" };
import qualifiersJson from "../src/data/qualifiers.json" with { type: "json" };
import staffJson from "../src/data/staff.json" with { type: "json" };
import signupsJson from "../src/data/signups.json" with { type: "json" };

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

const idOf = (url) => Number(/users\/(\d+)/.exec(url)?.[1]);

async function seedStaff() {
  const people = new Map();
  for (const p of [...staffJson.organizational, ...staffJson.assistive]) {
    const id = idOf(p.osuProfile);
    if (!id) continue;
    const prev = people.get(id);
    people.set(id, { ...p, id, roles: [...new Set([...(prev?.roles ?? []), ...p.roles])] });
  }
  let i = 0;
  for (const p of people.values()) {
    await db
      .insert(users)
      .values({ osuId: p.id, username: p.username, avatarUrl: p.picture, country: p.country.toUpperCase() })
      .onConflictDoNothing();
    await db.insert(staff).values({ osuId: p.id, displayRoles: p.roles, order: i++ }).onConflictDoNothing();
  }
  console.log(`staff: ${people.size}`);
}

async function seedSignups() {
  for (const s of signupsJson.signups) {
    const stats = { rank: s.rank, countryRank: s.countryRank, pp: s.pp, accuracy: s.accuracy, statsAt: new Date(s.lastUpdated) };
    await db
      .insert(users)
      .values({ osuId: s.userId, username: s.username, avatarUrl: s.pfp, country: s.country.toUpperCase(), seeded: true, ...stats })
      .onConflictDoUpdate({ target: users.osuId, set: stats });
    await db
      .insert(registrations)
      .values({ osuId: s.userId, status: s.status, createdAt: new Date(s.signupDate) })
      .onConflictDoNothing();
  }
  console.log(`signups: ${signupsJson.signups.length}`);
}

const SLOTS = ["28T16:00", "28T18:30", "28T21:00", "29T12:00", "29T15:00", "29T18:00", "29T20:30"];
const REFS = ["Raregendary", "SynchroHD", "Prahosnika"];

async function seedQualPlayers() {
  for (const p of qualifiersJson.players) {
    await db
      .insert(users)
      .values({ osuId: p.id, username: p.username, avatarUrl: p.avatar, country: p.cc.toUpperCase(), seeded: true })
      .onConflictDoNothing();
  }
}

async function seedLobbies() {
  const [has] = await db.select({ id: lobbies.id }).from(lobbies).where(eq(lobbies.seeded, true)).limit(1);
  if (has) return console.log("lobbies: already seeded");
  const byMatch = new Map();
  for (const p of qualifiersJson.players) {
    const first = Object.values(p.perf)[0];
    if (!first) continue;
    byMatch.set(first.matchName, [...(byMatch.get(first.matchName) ?? []), p.id]);
  }
  const groups = [...byMatch.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [i, [, ids]] of groups.entries()) {
    const [lobby] = await db
      .insert(lobbies)
      .values({
        name: `Lobby ${String.fromCharCode(65 + Math.floor(i / 3))}${(i % 3) + 1}`,
        startsAt: new Date(`2026-11-${SLOTS[i % SLOTS.length]}:00+02:00`),
        capacity: Math.max(8, ids.length),
        referee: REFS[i % 3],
        seeded: true,
      })
      .returning({ id: lobbies.id });
    for (const osuId of ids) await db.insert(lobbyBookings).values({ osuId, lobbyId: lobby.id }).onConflictDoNothing();
  }
  console.log(`lobbies: ${groups.length}`);
}

async function seedMaps() {
  const slugOf = { Qualifiers: "qualifiers", Quarterfinals: "quarterfinals", "Semi-Finals": "semifinals" };
  for (const s of mappoolsJson.mappools) {
    const [stage] = await db.select().from(stages).where(eq(stages.slug, slugOf[s.title])).limit(1);
    if (!stage) continue;
    const [has] = await db.select({ id: maps.id }).from(maps).where(eq(maps.stageId, stage.id)).limit(1);
    if (has) continue;
    for (const p of s.pools) {
      for (const [order, m] of p.maps.entries()) {
        await db.insert(maps).values({
          stageId: stage.id,
          mod: p.category,
          order,
          beatmapId: m.beatmap_id,
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
          seeded: true,
        });
      }
    }
    await db.update(stages).set({ poolReleased: true }).where(eq(stages.id, stage.id));
    console.log(`maps: ${s.title}`);
  }
}

async function seedQualScores() {
  const [has] = await db.select({ id: qualScores.id }).from(qualScores).limit(1);
  if (has) return console.log("qual scores: already there");
  const booked = new Map((await db.select().from(lobbyBookings)).map((b) => [b.osuId, b.lobbyId]));
  let n = 0;
  for (const p of qualifiersJson.players) {
    for (const [beatmapId, v] of Object.entries(p.perf)) {
      await db
        .insert(qualScores)
        .values({ osuId: p.id, beatmapId: Number(beatmapId), lobbyId: booked.get(p.id) ?? null, score: v.score, acc: v.acc, mods: v.mods, grade: v.rank, seeded: true })
        .onConflictDoNothing();
      n++;
    }
  }
  console.log(`qual scores: ${n}`);
}

await seedStaff();
await seedMaps();
await seedSignups();
await seedQualPlayers();
await seedLobbies();
await seedQualScores();
await client.end();
