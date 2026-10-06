ALTER TABLE "registrations" ADD COLUMN "rank_lock" integer;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "badges_lock" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "bws_locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bgcc7"."registrations" ADD COLUMN "rank_lock" integer;--> statement-breakpoint
ALTER TABLE "bgcc7"."registrations" ADD COLUMN "badges_lock" integer;--> statement-breakpoint
ALTER TABLE "bgcc7"."settings" ADD COLUMN "bws_locked_at" timestamp with time zone;
