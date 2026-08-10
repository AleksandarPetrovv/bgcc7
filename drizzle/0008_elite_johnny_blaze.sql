CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"stage_slug" text NOT NULL,
	"bracket" text NOT NULL,
	"round" text NOT NULL,
	"order" integer NOT NULL,
	"team1_id" text,
	"team2_id" text,
	"score1" integer,
	"score2" integer,
	"winner" integer,
	"starts_at" timestamp with time zone,
	"mp_links" text DEFAULT '' NOT NULL,
	"referee" text,
	"streamer" text,
	"commentators" text,
	"vod_url" text,
	"manual" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"osu_id" integer PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"is_captain" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"seed" integer DEFAULT 0 NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team1_id_teams_id_fk" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team2_id_teams_id_fk" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_osu_id_users_osu_id_fk" FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "matches" ("id", "stage_slug", "bracket", "round", "order") VALUES
  ('WB-R1-M1', 'quarterfinals', 'winners', 'Round 1 (Quarter-Finals)', 1),
  ('WB-R1-M2', 'quarterfinals', 'winners', 'Round 1 (Quarter-Finals)', 2),
  ('WB-R1-M3', 'quarterfinals', 'winners', 'Round 1 (Quarter-Finals)', 3),
  ('WB-R1-M4', 'quarterfinals', 'winners', 'Round 1 (Quarter-Finals)', 4),
  ('WB-R2-M1', 'semifinals', 'winners', 'Round 2 (Semi-Finals)', 5),
  ('WB-R2-M2', 'semifinals', 'winners', 'Round 2 (Semi-Finals)', 6),
  ('LB-R1-M1', 'semifinals', 'losers', 'Losers Round 1', 7),
  ('LB-R1-M2', 'semifinals', 'losers', 'Losers Round 1', 8),
  ('LB-R2-M1', 'semifinals', 'losers', 'Losers Round 2', 9),
  ('LB-R2-M2', 'semifinals', 'losers', 'Losers Round 2', 10),
  ('WB-R3-M1', 'finals', 'winners', 'Winners Finals', 11),
  ('LB-R3-M1', 'finals', 'losers', 'Losers Round 3', 12),
  ('LB-R4-M1', 'finals', 'losers', 'Losers Finals', 13),
  ('GF-M1', 'grand-finals', 'grand', 'Grand Finals', 14),
  ('GF-M2', 'grand-finals', 'grand', 'Grand Finals', 15)
ON CONFLICT ("id") DO NOTHING;
