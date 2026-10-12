ALTER TABLE "settings" ADD COLUMN "copy" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bgcc7"."settings" ADD COLUMN "copy" jsonb DEFAULT '{}'::jsonb NOT NULL;