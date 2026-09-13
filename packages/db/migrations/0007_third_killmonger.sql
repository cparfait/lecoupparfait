CREATE TABLE "rated_intents" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"bot_level" smallint NOT NULL,
	"initial_time" integer DEFAULT 0 NOT NULL,
	"increment" integer DEFAULT 0 NOT NULL,
	"player_color" varchar(1) NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rated_intents" ADD CONSTRAINT "rated_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;