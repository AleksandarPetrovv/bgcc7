import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  osuId: integer("osu_id").primaryKey(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  country: text("country"),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
