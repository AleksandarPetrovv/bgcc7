ALTER TABLE "settings" DROP COLUMN IF EXISTS "pickems_open";--> statement-breakpoint
ALTER TABLE "bgcc7"."settings" DROP COLUMN IF EXISTS "pickems_open";--> statement-breakpoint
DELETE FROM "admin_log" WHERE "action" = 'settings.pickems';