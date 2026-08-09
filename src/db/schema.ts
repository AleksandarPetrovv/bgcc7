import { sql } from "drizzle-orm";
import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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
  timeline: jsonb("timeline").$type<{ key: string; dates: string }[]>().notNull(),
  timelineAt: text("timeline_at"),
  qualifyCount: integer("qualify_count").notNull().default(24),
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
