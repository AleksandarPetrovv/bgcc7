CREATE TABLE "user_names" (
	"osu_id" integer NOT NULL,
	"username" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_names_osu_id_username_unique" UNIQUE("osu_id","username")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "scene" text;--> statement-breakpoint
ALTER TABLE "user_names" ADD CONSTRAINT "user_names_osu_id_users_osu_id_fk" FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bgcc7"."matches" ADD COLUMN "scene" text;--> statement-breakpoint
INSERT INTO "user_names" ("osu_id", "username", "at") SELECT "osu_id", "username", "created_at" FROM "users" ON CONFLICT DO NOTHING;