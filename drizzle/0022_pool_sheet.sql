CREATE TABLE "pool_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" integer NOT NULL,
	"mod" text NOT NULL,
	"slot" integer NOT NULL,
	"osu_id" integer NOT NULL,
	"beatmap_id" integer NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"version" text NOT NULL,
	"creator" text NOT NULL,
	"sr" double precision NOT NULL,
	"bpm" double precision NOT NULL,
	"length" integer NOT NULL,
	"ar" double precision NOT NULL,
	"od" double precision NOT NULL,
	"cs" double precision NOT NULL,
	"cover" text NOT NULL,
	"picked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_votes" (
	"suggestion_id" integer NOT NULL,
	"osu_id" integer NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "pool_votes_suggestion_id_osu_id_unique" UNIQUE("suggestion_id","osu_id")
);
--> statement-breakpoint
ALTER TABLE "pool_suggestions" ADD CONSTRAINT "pool_suggestions_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_votes" ADD CONSTRAINT "pool_votes_suggestion_id_pool_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."pool_suggestions"("id") ON DELETE cascade ON UPDATE no action;