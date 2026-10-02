ALTER TABLE "stages" ADD COLUMN "blueprint" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "stages" s SET "blueprint" = coalesce((SELECT jsonb_object_agg(m.mod, m.n) FROM (SELECT mod, max("order") + 1 AS n FROM "maps" WHERE stage_id = s.id GROUP BY mod) m), '{}'::jsonb) WHERE s."blueprint" = '{}'::jsonb;
--> statement-breakpoint
UPDATE "stages" SET "blueprint" = ("blueprint" - 'FreeMod' - 'Tiebreaker') WHERE slug = 'qualifiers';--> statement-breakpoint
UPDATE "stages" SET "blueprint" = "blueprint" || '{"Tiebreaker": 1}'::jsonb WHERE slug <> 'qualifiers';
