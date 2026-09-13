CREATE TABLE "level_tests" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"puzzle_rating" integer NOT NULL,
	"game_rating" integer NOT NULL,
	"sigma" integer NOT NULL,
	"positions" smallint NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "level_tests" ADD CONSTRAINT "level_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;