CREATE TABLE "score_edits" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"game_id" integer NOT NULL,
	"osu_id" integer NOT NULL,
	"team" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"acc" double precision DEFAULT 1 NOT NULL,
	"mods" text DEFAULT '' NOT NULL,
	"removed" boolean DEFAULT false NOT NULL,
	"edited_by" integer,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_edits_match_id_game_id_osu_id_unique" UNIQUE("match_id","game_id","osu_id")
);
--> statement-breakpoint
ALTER TABLE "score_edits" ADD CONSTRAINT "score_edits_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;