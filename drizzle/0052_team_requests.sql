CREATE TABLE "team_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"osu_id" integer NOT NULL,
	"name" text,
	"pic" bytea,
	"mime" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"decided_by" integer,
	"decided_at" timestamp with time zone,
	"seen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "bgcc7"."team_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"osu_id" integer NOT NULL,
	"name" text,
	"pic" bytea,
	"mime" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"decided_by" integer,
	"decided_at" timestamp with time zone,
	"seen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bgcc7"."team_requests" ADD CONSTRAINT "team_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "bgcc7"."teams"("id") ON DELETE cascade ON UPDATE no action;