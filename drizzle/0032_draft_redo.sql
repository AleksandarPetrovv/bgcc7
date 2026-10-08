ALTER TABLE "drafts" ADD COLUMN "redo" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bgcc7"."drafts" ADD COLUMN "redo" jsonb DEFAULT '[]'::jsonb NOT NULL;
