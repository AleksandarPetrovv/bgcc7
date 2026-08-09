CREATE TABLE "admin_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"osu_id" integer NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"phase" text NOT NULL,
	"sections" jsonb NOT NULL,
	"reg_opens_at" timestamp with time zone,
	"reg_closes_at" timestamp with time zone,
	"booking_opens_at" timestamp with time zone,
	"booking_closes_at" timestamp with time zone,
	"pickems_open" boolean DEFAULT false NOT NULL,
	"timeline" jsonb NOT NULL,
	"timeline_at" text,
	"qualify_count" integer DEFAULT 24 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"osu_id" integer PRIMARY KEY NOT NULL,
	"perm_role" text,
	"display_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_osu_id_users_osu_id_fk" FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade ON UPDATE no action;