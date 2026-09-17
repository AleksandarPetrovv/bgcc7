CREATE TABLE IF NOT EXISTS "drafts" (
	"match_id" text PRIMARY KEY NOT NULL,
	"stage_slug" text NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"bans" integer DEFAULT 2 NOT NULL,
	"ban_order" text DEFAULT 'abab' NOT NULL,
	"roll1" integer,
	"roll2" integer,
	"choice" text,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rev" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "bans" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "ban_order" text DEFAULT 'abab' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drafts" ADD CONSTRAINT "drafts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;