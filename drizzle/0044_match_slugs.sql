-- match ids become their url slugs (winners-quarterfinals-3, winners-final, grand-final-reset, ...)
CREATE TEMP TABLE mid_map (s text, old text, new text);
INSERT INTO mid_map VALUES
  ('public', 'WB-R1-M1', 'winners-quarterfinals-1'),
  ('public', 'WB-R1-M2', 'winners-quarterfinals-2'),
  ('public', 'WB-R1-M3', 'winners-quarterfinals-3'),
  ('public', 'WB-R1-M4', 'winners-quarterfinals-4'),
  ('public', 'WB-R2-M1', 'winners-semifinals-1'),
  ('public', 'WB-R2-M2', 'winners-semifinals-2'),
  ('public', 'WB-R3-M1', 'winners-final'),
  ('public', 'LB-R1-M1', 'losers-round-1-1'),
  ('public', 'LB-R1-M2', 'losers-round-1-2'),
  ('public', 'LB-R2-M1', 'losers-round-2-1'),
  ('public', 'LB-R2-M2', 'losers-round-2-2'),
  ('public', 'LB-R3-M1', 'losers-round-3'),
  ('public', 'LB-R4-M1', 'losers-final'),
  ('public', 'GF-M1', 'grand-final'),
  ('public', 'GF-M2', 'grand-final-reset'),
  ('public', 'TEST-M1', 'test-1'),
  ('bgcc7', 'WB-R1-M1', 'winners-round-of-16-1'),
  ('bgcc7', 'WB-R1-M2', 'winners-round-of-16-2'),
  ('bgcc7', 'WB-R1-M3', 'winners-round-of-16-3'),
  ('bgcc7', 'WB-R1-M4', 'winners-round-of-16-4'),
  ('bgcc7', 'WB-R1-M5', 'winners-round-of-16-5'),
  ('bgcc7', 'WB-R1-M6', 'winners-round-of-16-6'),
  ('bgcc7', 'WB-R1-M7', 'winners-round-of-16-7'),
  ('bgcc7', 'WB-R1-M8', 'winners-round-of-16-8'),
  ('bgcc7', 'WB-R2-M1', 'winners-quarterfinals-1'),
  ('bgcc7', 'WB-R2-M2', 'winners-quarterfinals-2'),
  ('bgcc7', 'WB-R2-M3', 'winners-quarterfinals-3'),
  ('bgcc7', 'WB-R2-M4', 'winners-quarterfinals-4'),
  ('bgcc7', 'WB-R3-M1', 'winners-semifinals-1'),
  ('bgcc7', 'WB-R3-M2', 'winners-semifinals-2'),
  ('bgcc7', 'WB-R4-M1', 'winners-final'),
  ('bgcc7', 'LB-R1-M1', 'losers-round-1-1'),
  ('bgcc7', 'LB-R1-M2', 'losers-round-1-2'),
  ('bgcc7', 'LB-R1-M3', 'losers-round-1-3'),
  ('bgcc7', 'LB-R1-M4', 'losers-round-1-4'),
  ('bgcc7', 'LB-R2-M1', 'losers-round-2-1'),
  ('bgcc7', 'LB-R2-M2', 'losers-round-2-2'),
  ('bgcc7', 'LB-R2-M3', 'losers-round-2-3'),
  ('bgcc7', 'LB-R2-M4', 'losers-round-2-4'),
  ('bgcc7', 'LB-R3-M1', 'losers-round-3-1'),
  ('bgcc7', 'LB-R3-M2', 'losers-round-3-2'),
  ('bgcc7', 'LB-R4-M1', 'losers-round-4-1'),
  ('bgcc7', 'LB-R4-M2', 'losers-round-4-2'),
  ('bgcc7', 'LB-R5-M1', 'losers-round-5'),
  ('bgcc7', 'LB-R6-M1', 'losers-final'),
  ('bgcc7', 'GF-M1', 'grand-final'),
  ('bgcc7', 'GF-M2', 'grand-final-reset'),
  ('bgcc7', 'TEST-M1', 'test-1');
--> statement-breakpoint
INSERT INTO "public"."matches" SELECT (jsonb_populate_record(NULL::"public"."matches", to_jsonb(m) || jsonb_build_object('id', x.new))).* FROM "public"."matches" m JOIN mid_map x ON x.s = 'public' AND x.old = m.id;
--> statement-breakpoint
UPDATE "public"."drafts" c SET match_id = x.new FROM mid_map x WHERE x.s = 'public' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "public"."match_cache" c SET match_id = x.new FROM mid_map x WHERE x.s = 'public' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "public"."mp_chat" c SET match_id = x.new FROM mid_map x WHERE x.s = 'public' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "public"."mp_lobbies" c SET match_id = x.new FROM mid_map x WHERE x.s = 'public' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "public"."reschedules" c SET match_id = x.new FROM mid_map x WHERE x.s = 'public' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "public"."score_edits" c SET match_id = x.new FROM mid_map x WHERE x.s = 'public' AND x.old = c.match_id;
--> statement-breakpoint
DELETE FROM "public"."matches" m USING mid_map x WHERE x.s = 'public' AND x.old = m.id;
--> statement-breakpoint
UPDATE "public"."pickems" p SET picks = (SELECT jsonb_object_agg(coalesce(x.new, e.k), e.v) FROM jsonb_each(p.picks) e(k, v) LEFT JOIN mid_map x ON x.s = 'public' AND x.old = e.k) WHERE jsonb_typeof(p.picks) = 'object' AND p.picks <> '{}'::jsonb;
--> statement-breakpoint
INSERT INTO "bgcc7"."matches" SELECT (jsonb_populate_record(NULL::"bgcc7"."matches", to_jsonb(m) || jsonb_build_object('id', x.new))).* FROM "bgcc7"."matches" m JOIN mid_map x ON x.s = 'bgcc7' AND x.old = m.id;
--> statement-breakpoint
UPDATE "bgcc7"."drafts" c SET match_id = x.new FROM mid_map x WHERE x.s = 'bgcc7' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "bgcc7"."match_cache" c SET match_id = x.new FROM mid_map x WHERE x.s = 'bgcc7' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "bgcc7"."mp_chat" c SET match_id = x.new FROM mid_map x WHERE x.s = 'bgcc7' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "bgcc7"."mp_lobbies" c SET match_id = x.new FROM mid_map x WHERE x.s = 'bgcc7' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "bgcc7"."reschedules" c SET match_id = x.new FROM mid_map x WHERE x.s = 'bgcc7' AND x.old = c.match_id;
--> statement-breakpoint
UPDATE "bgcc7"."score_edits" c SET match_id = x.new FROM mid_map x WHERE x.s = 'bgcc7' AND x.old = c.match_id;
--> statement-breakpoint
DELETE FROM "bgcc7"."matches" m USING mid_map x WHERE x.s = 'bgcc7' AND x.old = m.id;
--> statement-breakpoint
UPDATE "bgcc7"."pickems" p SET picks = (SELECT jsonb_object_agg(coalesce(x.new, e.k), e.v) FROM jsonb_each(p.picks) e(k, v) LEFT JOIN mid_map x ON x.s = 'bgcc7' AND x.old = e.k) WHERE jsonb_typeof(p.picks) = 'object' AND p.picks <> '{}'::jsonb;
--> statement-breakpoint
UPDATE "public"."admin_log" l SET payload = jsonb_set(l.payload, '{matchId}', to_jsonb(x.new)) FROM mid_map x WHERE x.s = (CASE WHEN l.payload->>'_edition' = 'bgcc7' THEN 'bgcc7' ELSE 'public' END) AND x.old = l.payload->>'matchId';
--> statement-breakpoint
UPDATE "public"."admin_log" l SET payload = jsonb_set(l.payload, '{id}', to_jsonb(x.new)) FROM mid_map x WHERE x.s = (CASE WHEN l.payload->>'_edition' = 'bgcc7' THEN 'bgcc7' ELSE 'public' END) AND x.old = l.payload->>'id';
--> statement-breakpoint
DROP TABLE mid_map;
