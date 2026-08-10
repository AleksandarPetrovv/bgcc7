CREATE TABLE "qual_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"osu_id" integer NOT NULL,
	"beatmap_id" integer NOT NULL,
	"lobby_id" integer,
	"score" integer NOT NULL,
	"acc" double precision NOT NULL,
	"mods" text DEFAULT '' NOT NULL,
	"grade" text DEFAULT '' NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	CONSTRAINT "qual_scores_osu_id_beatmap_id_unique" UNIQUE("osu_id","beatmap_id")
);
--> statement-breakpoint
ALTER TABLE "qual_scores" ADD CONSTRAINT "qual_scores_osu_id_users_osu_id_fk" FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qual_scores" ADD CONSTRAINT "qual_scores_lobby_id_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."lobbies"("id") ON DELETE set null ON UPDATE no action;