CREATE TABLE "pickems" (
	"osu_id" integer PRIMARY KEY NOT NULL,
	"picks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"osu_id" integer PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pickems" ADD CONSTRAINT "pickems_osu_id_users_osu_id_fk" FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade ON UPDATE no action;