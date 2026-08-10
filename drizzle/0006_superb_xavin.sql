CREATE TABLE "maps" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" integer NOT NULL,
	"mod" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
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
	"seeded" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"first_to" integer,
	"pool_released" boolean DEFAULT false NOT NULL,
	CONSTRAINT "stages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "stages" ("slug", "title", "order", "first_to") VALUES
  ('qualifiers', 'Qualifiers', 0, NULL),
  ('quarterfinals', 'Quarterfinals', 1, 5),
  ('semifinals', 'Semifinals', 2, 6),
  ('finals', 'Finals', 3, 6),
  ('grand-finals', 'Grand Finals', 4, 7)
ON CONFLICT ("slug") DO NOTHING;
