ALTER TABLE "settings" ADD COLUMN "weeks" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bgcc7"."settings" ADD COLUMN "weeks" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "settings" SET "weeks" = (SELECT coalesce(jsonb_object_agg(n, week), '{}'::jsonb) FROM (SELECT CASE "slug" WHEN 'quarterfinals' THEN '1' WHEN 'semifinals' THEN '2' WHEN 'finals' THEN '3' WHEN 'grand-finals' THEN '4' END AS n, "week" FROM "stages" WHERE "week" IS NOT NULL) w WHERE n IS NOT NULL);--> statement-breakpoint
ALTER TABLE "stages" DROP COLUMN "week";--> statement-breakpoint
ALTER TABLE "bgcc7"."stages" DROP COLUMN "week";
