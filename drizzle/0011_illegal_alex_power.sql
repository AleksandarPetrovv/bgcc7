ALTER TABLE "sponsors" ADD COLUMN "osu_id" integer;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "pack_size" integer;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "pack_at" timestamp with time zone;