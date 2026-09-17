ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "ban_secs" integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "pick_secs" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "timeout_secs" integer DEFAULT 180 NOT NULL;