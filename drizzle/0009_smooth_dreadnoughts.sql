CREATE TABLE "sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"url" text,
	"order" integer DEFAULT 0 NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "links" jsonb DEFAULT '{}'::jsonb NOT NULL;