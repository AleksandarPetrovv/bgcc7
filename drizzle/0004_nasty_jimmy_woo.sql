ALTER TABLE "registrations" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "decided_by" integer;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rank" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country_rank" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pp" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "accuracy" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stats_at" timestamp with time zone;