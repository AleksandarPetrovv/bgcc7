CREATE TABLE "lobbies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"capacity" integer DEFAULT 8 NOT NULL,
	"referee" text,
	"mp_links" text DEFAULT '' NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lobby_bookings" (
	"osu_id" integer PRIMARY KEY NOT NULL,
	"lobby_id" integer NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lobby_bookings" ADD CONSTRAINT "lobby_bookings_osu_id_users_osu_id_fk" FOREIGN KEY ("osu_id") REFERENCES "public"."users"("osu_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_bookings" ADD CONSTRAINT "lobby_bookings_lobby_id_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."lobbies"("id") ON DELETE cascade ON UPDATE no action;