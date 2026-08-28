UPDATE "matches" SET "stage_slug" = 'quarterfinals' WHERE "id" IN ('LB-R1-M1', 'LB-R1-M2');
--> statement-breakpoint
DELETE FROM "match_cache" WHERE "match_id" IN ('LB-R1-M1', 'LB-R1-M2');
