CREATE TABLE "mp_chat" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"mp_id" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"from" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mp_chat" ADD CONSTRAINT "mp_chat_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_chat_mp_idx" ON "mp_chat" USING btree ("mp_id","id");--> statement-breakpoint
CREATE TABLE "bgcc7"."mp_chat" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"mp_id" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"from" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bgcc7"."mp_chat" ADD CONSTRAINT "mp_chat_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "bgcc7"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_chat_mp_idx" ON "bgcc7"."mp_chat" USING btree ("mp_id","id");