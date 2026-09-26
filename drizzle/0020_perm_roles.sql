ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "perm_roles" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "staff" SET "perm_roles" = CASE WHEN "perm_role" = 'admin' THEN ARRAY['referee','mappooler'] ELSE ARRAY["perm_role"] END WHERE "perm_role" IS NOT NULL AND "perm_role" <> '';
