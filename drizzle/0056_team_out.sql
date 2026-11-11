ALTER TABLE "matches" ADD COLUMN "ff_side" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ff_kind" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "out" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "out_reason" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "out_seen_by" integer[] DEFAULT '{}'::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "bgcc7"."matches" ADD COLUMN "ff_side" integer;--> statement-breakpoint
ALTER TABLE "bgcc7"."matches" ADD COLUMN "ff_kind" text;--> statement-breakpoint
ALTER TABLE "bgcc7"."teams" ADD COLUMN "out" text;--> statement-breakpoint
ALTER TABLE "bgcc7"."teams" ADD COLUMN "out_reason" text;--> statement-breakpoint
ALTER TABLE "bgcc7"."teams" ADD COLUMN "out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bgcc7"."teams" ADD COLUMN "out_seen_by" integer[] DEFAULT '{}'::integer[] NOT NULL;
