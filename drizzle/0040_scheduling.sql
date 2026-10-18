ALTER TABLE "stages" ADD COLUMN "week" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_name" text;--> statement-breakpoint
ALTER TABLE "bgcc7"."stages" ADD COLUMN "week" text;--> statement-breakpoint
UPDATE "stages" s SET "week" = w.wk FROM (SELECT "stage_slug", to_char(date_trunc('week', min("starts_at" AT TIME ZONE 'Europe/Sofia')), 'YYYY-MM-DD') AS wk FROM "matches" WHERE "starts_at" IS NOT NULL GROUP BY "stage_slug") w WHERE w."stage_slug" = s."slug";--> statement-breakpoint
UPDATE "bgcc7"."stages" s SET "week" = w.wk FROM (SELECT "stage_slug", to_char(date_trunc('week', min("starts_at" AT TIME ZONE 'Europe/Sofia')), 'YYYY-MM-DD') AS wk FROM "bgcc7"."matches" WHERE "starts_at" IS NOT NULL GROUP BY "stage_slug") w WHERE w."stage_slug" = s."slug";
