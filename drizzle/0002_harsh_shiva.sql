CREATE TABLE "match_cache" (
	"match_id" text PRIMARY KEY NOT NULL,
	"links" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
