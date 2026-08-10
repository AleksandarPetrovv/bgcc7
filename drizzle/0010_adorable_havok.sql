CREATE TABLE "reschedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"team_id" text NOT NULL,
	"requested_by" integer NOT NULL,
	"proposed_at" timestamp with time zone NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"answered_by" integer,
	"decided_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reschedules" ADD CONSTRAINT "reschedules_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reschedules" ADD CONSTRAINT "reschedules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;