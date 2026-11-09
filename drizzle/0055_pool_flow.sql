CREATE TABLE "host_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"lines" text[] DEFAULT '{}' NOT NULL,
	"href" text DEFAULT '' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_by" integer[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bgcc7"."host_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"lines" text[] DEFAULT '{}' NOT NULL,
	"href" text DEFAULT '' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_by" integer[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bgcc7"."stages" ADD COLUMN "settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "subcategory_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "bgcc7"."maps" ADD COLUMN "subcategory_ids" text[] DEFAULT '{}'::text[] NOT NULL;
