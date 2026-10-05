ALTER TABLE "settings" ADD COLUMN "edition" text DEFAULT 'bgcc6' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "badges" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "badge_override" integer;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "bgcc7";
--> statement-breakpoint
CREATE TABLE "bgcc7"."settings" (LIKE "public"."settings" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."registrations" (LIKE "public"."registrations" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."lobbies" (LIKE "public"."lobbies" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."lobby_bookings" (LIKE "public"."lobby_bookings" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."stages" (LIKE "public"."stages" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."maps" (LIKE "public"."maps" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."pool_suggestions" (LIKE "public"."pool_suggestions" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."pool_votes" (LIKE "public"."pool_votes" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."qual_scores" (LIKE "public"."qual_scores" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."teams" (LIKE "public"."teams" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."team_members" (LIKE "public"."team_members" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."matches" (LIKE "public"."matches" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."match_cache" (LIKE "public"."match_cache" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."drafts" (LIKE "public"."drafts" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."reschedules" (LIKE "public"."reschedules" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."score_edits" (LIKE "public"."score_edits" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."pickems" (LIKE "public"."pickems" INCLUDING ALL);
--> statement-breakpoint
CREATE TABLE "bgcc7"."sponsors" (LIKE "public"."sponsors" INCLUDING ALL);
--> statement-breakpoint
ALTER TABLE "bgcc7"."registrations" ADD FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."lobby_bookings" ADD FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."lobby_bookings" ADD FOREIGN KEY ("lobby_id") REFERENCES "bgcc7"."lobbies"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."maps" ADD FOREIGN KEY ("stage_id") REFERENCES "bgcc7"."stages"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."pool_suggestions" ADD FOREIGN KEY ("stage_id") REFERENCES "bgcc7"."stages"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."pool_votes" ADD FOREIGN KEY ("suggestion_id") REFERENCES "bgcc7"."pool_suggestions"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."qual_scores" ADD FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."qual_scores" ADD FOREIGN KEY ("lobby_id") REFERENCES "bgcc7"."lobbies"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "bgcc7"."team_members" ADD FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."team_members" ADD FOREIGN KEY ("team_id") REFERENCES "bgcc7"."teams"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."matches" ADD FOREIGN KEY ("team1_id") REFERENCES "bgcc7"."teams"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "bgcc7"."matches" ADD FOREIGN KEY ("team2_id") REFERENCES "bgcc7"."teams"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "bgcc7"."drafts" ADD FOREIGN KEY ("match_id") REFERENCES "bgcc7"."matches"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."reschedules" ADD FOREIGN KEY ("match_id") REFERENCES "bgcc7"."matches"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."reschedules" ADD FOREIGN KEY ("team_id") REFERENCES "bgcc7"."teams"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."score_edits" ADD FOREIGN KEY ("match_id") REFERENCES "bgcc7"."matches"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "bgcc7"."pickems" ADD FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade;
--> statement-breakpoint
INSERT INTO "bgcc7"."stages" ("slug", "title", "order", "first_to") VALUES
  ('round-of-16', 'Round of 16', 0, 5),
  ('quarterfinals', 'Quarterfinals', 1, 6),
  ('semifinals', 'Semifinals', 2, 6),
  ('finals', 'Finals', 3, 7),
  ('grand-finals', 'Grand Finals', 4, 7);
--> statement-breakpoint
INSERT INTO "bgcc7"."matches" ("id", "stage_slug", "bracket", "round", "order") VALUES
('WB-R1-M1', 'round-of-16', 'winners', 'Round of 16', 1),
  ('WB-R1-M2', 'round-of-16', 'winners', 'Round of 16', 2),
  ('WB-R1-M3', 'round-of-16', 'winners', 'Round of 16', 3),
  ('WB-R1-M4', 'round-of-16', 'winners', 'Round of 16', 4),
  ('WB-R1-M5', 'round-of-16', 'winners', 'Round of 16', 5),
  ('WB-R1-M6', 'round-of-16', 'winners', 'Round of 16', 6),
  ('WB-R1-M7', 'round-of-16', 'winners', 'Round of 16', 7),
  ('WB-R1-M8', 'round-of-16', 'winners', 'Round of 16', 8),
  ('LB-R1-M1', 'round-of-16', 'losers', 'Losers Round 1', 9),
  ('LB-R1-M2', 'round-of-16', 'losers', 'Losers Round 1', 10),
  ('LB-R1-M3', 'round-of-16', 'losers', 'Losers Round 1', 11),
  ('LB-R1-M4', 'round-of-16', 'losers', 'Losers Round 1', 12),
  ('WB-R2-M1', 'quarterfinals', 'winners', 'Quarterfinals', 13),
  ('WB-R2-M2', 'quarterfinals', 'winners', 'Quarterfinals', 14),
  ('WB-R2-M3', 'quarterfinals', 'winners', 'Quarterfinals', 15),
  ('WB-R2-M4', 'quarterfinals', 'winners', 'Quarterfinals', 16),
  ('LB-R2-M1', 'quarterfinals', 'losers', 'Losers Round 2', 17),
  ('LB-R2-M2', 'quarterfinals', 'losers', 'Losers Round 2', 18),
  ('LB-R2-M3', 'quarterfinals', 'losers', 'Losers Round 2', 19),
  ('LB-R2-M4', 'quarterfinals', 'losers', 'Losers Round 2', 20),
  ('WB-R3-M1', 'semifinals', 'winners', 'Semifinals', 21),
  ('WB-R3-M2', 'semifinals', 'winners', 'Semifinals', 22),
  ('LB-R3-M1', 'semifinals', 'losers', 'Losers Round 3', 23),
  ('LB-R3-M2', 'semifinals', 'losers', 'Losers Round 3', 24),
  ('LB-R4-M1', 'semifinals', 'losers', 'Losers Round 4', 25),
  ('LB-R4-M2', 'semifinals', 'losers', 'Losers Round 4', 26),
  ('WB-R4-M1', 'finals', 'winners', 'Winners Finals', 27),
  ('LB-R5-M1', 'finals', 'losers', 'Losers Round 5', 28),
  ('LB-R6-M1', 'finals', 'losers', 'Losers Finals', 29),
  ('GF-M1', 'grand-finals', 'grand', 'Grand Finals', 30),
  ('GF-M2', 'grand-finals', 'grand', 'Grand Finals', 31);
