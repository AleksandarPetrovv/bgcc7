CREATE TABLE "mp_lobbies" (
	"match_id" text PRIMARY KEY NOT NULL,
	"mp_id" integer NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "mp_lobbies" ADD CONSTRAINT "mp_lobbies_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "bgcc7"."mp_lobbies" (
	"match_id" text PRIMARY KEY NOT NULL,
	"mp_id" integer NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bgcc7"."mp_lobbies" ADD CONSTRAINT "mp_lobbies_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "bgcc7"."matches"("id") ON DELETE cascade ON UPDATE no action;