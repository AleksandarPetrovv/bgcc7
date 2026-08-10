import { sql } from "drizzle-orm";
import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  osuId: integer("osu_id").primaryKey(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  country: text("country"),
  seeded: boolean("seeded").notNull().default(false),
  rank: integer("rank"),
  countryRank: integer("country_rank"),
  pp: doublePrecision("pp"),
  accuracy: doublePrecision("accuracy"),
  statsAt: timestamp("stats_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pickems = pgTable("pickems", {
  osuId: integer("osu_id")
    .primaryKey()
    .references(() => users.osuId, { onDelete: "cascade" }),
  picks: jsonb("picks").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const registrations = pgTable("registrations", {
  osuId: integer("osu_id")
    .primaryKey()
    .references(() => users.osuId, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  note: text("note"),
  decidedBy: integer("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchCache = pgTable("match_cache", {
  matchId: text("match_id").primaryKey(),
  links: text("links").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  phase: text("phase").notNull(),
  sections: jsonb("sections").$type<Record<string, boolean>>().notNull(),
  regOpensAt: timestamp("reg_opens_at", { withTimezone: true }),
  regClosesAt: timestamp("reg_closes_at", { withTimezone: true }),
  bookingOpensAt: timestamp("booking_opens_at", { withTimezone: true }),
  bookingClosesAt: timestamp("booking_closes_at", { withTimezone: true }),
  pickemsOpen: boolean("pickems_open").notNull().default(false),
  timeline: jsonb("timeline").$type<{ key: string; from?: string | null; to?: string | null }[]>().notNull(),
  timelineAt: text("timeline_at"),
  qualifyCount: integer("qualify_count").notNull().default(24),
  links: jsonb("links").$type<Record<string, string>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staff = pgTable("staff", {
  osuId: integer("osu_id")
    .primaryKey()
    .references(() => users.osuId, { onDelete: "cascade" }),
  permRole: text("perm_role"),
  displayRoles: text("display_roles").array().notNull().default(sql`'{}'::text[]`),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminLog = pgTable("admin_log", {
  id: serial("id").primaryKey(),
  osuId: integer("osu_id").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const lobbies = pgTable("lobbies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull().default(8),
  referee: text("referee"),
  mpLinks: text("mp_links").notNull().default(""),
  seeded: boolean("seeded").notNull().default(false),
});

export const lobbyBookings = pgTable("lobby_bookings", {
  osuId: integer("osu_id")
    .primaryKey()
    .references(() => users.osuId, { onDelete: "cascade" }),
  lobbyId: integer("lobby_id")
    .notNull()
    .references(() => lobbies.id, { onDelete: "cascade" }),
  bookedAt: timestamp("booked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stages = pgTable("stages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  firstTo: integer("first_to"),
  poolReleased: boolean("pool_released").notNull().default(false),
});

export const maps = pgTable("maps", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  mod: text("mod").notNull(),
  order: integer("order").notNull().default(0),
  beatmapId: integer("beatmap_id").notNull(),
  title: text("title").notNull(),
  artist: text("artist").notNull().default(""),
  version: text("version").notNull(),
  creator: text("creator").notNull(),
  sr: doublePrecision("sr").notNull(),
  bpm: doublePrecision("bpm").notNull(),
  length: integer("length").notNull(),
  ar: doublePrecision("ar").notNull(),
  od: doublePrecision("od").notNull(),
  cs: doublePrecision("cs").notNull(),
  cover: text("cover").notNull(),
  seeded: boolean("seeded").notNull().default(false),
});

export const qualScores = pgTable(
  "qual_scores",
  {
    id: serial("id").primaryKey(),
    osuId: integer("osu_id")
      .notNull()
      .references(() => users.osuId, { onDelete: "cascade" }),
    beatmapId: integer("beatmap_id").notNull(),
    lobbyId: integer("lobby_id").references(() => lobbies.id, { onDelete: "set null" }),
    score: integer("score").notNull(),
    acc: doublePrecision("acc").notNull(),
    mods: text("mods").notNull().default(""),
    grade: text("grade").notNull().default(""),
    seeded: boolean("seeded").notNull().default(false),
  },
  (t) => [unique().on(t.osuId, t.beatmapId)],
);

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull().default(""),
  seed: integer("seed").notNull().default(0),
  seeded: boolean("seeded").notNull().default(false),
});

export const teamMembers = pgTable("team_members", {
  osuId: integer("osu_id")
    .primaryKey()
    .references(() => users.osuId, { onDelete: "cascade" }),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  isCaptain: boolean("is_captain").notNull().default(false),
});

export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  stageSlug: text("stage_slug").notNull(),
  bracket: text("bracket").notNull(),
  round: text("round").notNull(),
  order: integer("order").notNull(),
  team1Id: text("team1_id").references(() => teams.id, { onDelete: "set null" }),
  team2Id: text("team2_id").references(() => teams.id, { onDelete: "set null" }),
  score1: integer("score1"),
  score2: integer("score2"),
  winner: integer("winner"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  mpLinks: text("mp_links").notNull().default(""),
  referee: text("referee"),
  streamer: text("streamer"),
  commentators: text("commentators"),
  vodUrl: text("vod_url"),
  manual: boolean("manual").notNull().default(false),
});

export const sponsors = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull().default(""),
  url: text("url"),
  order: integer("order").notNull().default(0),
  seeded: boolean("seeded").notNull().default(false),
});

export const reschedules = pgTable("reschedules", {
  id: serial("id").primaryKey(),
  matchId: text("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  requestedBy: integer("requested_by").notNull(),
  proposedAt: timestamp("proposed_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  answeredBy: integer("answered_by"),
  decidedBy: integer("decided_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
