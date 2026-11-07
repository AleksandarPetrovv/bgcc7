CREATE TABLE "availability" (
	"match_id" text NOT NULL,
	"osu_id" integer NOT NULL,
	"busy" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_match_user" ON "availability" USING btree ("match_id","osu_id");--> statement-breakpoint
CREATE TABLE "bgcc7"."availability" (
	"match_id" text NOT NULL,
	"osu_id" integer NOT NULL,
	"busy" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bgcc7"."availability" ADD CONSTRAINT "availability_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "bgcc7"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_match_user" ON "bgcc7"."availability" USING btree ("match_id","osu_id");