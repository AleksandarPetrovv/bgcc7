CREATE TABLE "ref_apps" (
	"osu_id" integer PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"irc_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone,
	CONSTRAINT "ref_apps_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "ref_apps" ADD CONSTRAINT "ref_apps_osu_id_users_osu_id_fk" FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade ON UPDATE no action;