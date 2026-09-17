ALTER TABLE "drafts" ADD COLUMN IF NOT EXISTS "turn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN IF NOT EXISTS "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN IF NOT EXISTS "pause_until" timestamp with time zone;