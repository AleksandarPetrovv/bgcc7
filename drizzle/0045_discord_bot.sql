CREATE TABLE "discord_state" (
	"key" text PRIMARY KEY NOT NULL,
	"channel_id" text DEFAULT '' NOT NULL,
	"message_id" text DEFAULT '' NOT NULL,
	"stamp" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_teams" (
	"team_id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"channel_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bgcc7"."discord_state" (
	"key" text PRIMARY KEY NOT NULL,
	"channel_id" text DEFAULT '' NOT NULL,
	"message_id" text DEFAULT '' NOT NULL,
	"stamp" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bgcc7"."discord_teams" (
	"team_id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"channel_id" text NOT NULL
);
