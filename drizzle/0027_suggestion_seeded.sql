ALTER TABLE "pool_suggestions" ADD COLUMN "seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bgcc7"."pool_suggestions" ADD COLUMN "seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "bgcc7"."pool_suggestions" SET "seeded" = true;
