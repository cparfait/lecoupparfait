CREATE TABLE "active_games" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"moves" text DEFAULT '' NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"defeated" smallint DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"chapter" smallint DEFAULT 1 NOT NULL,
	"lesson_done" boolean DEFAULT false NOT NULL,
	"puzzles_done" smallint DEFAULT 0 NOT NULL,
	"wins_in_chapter" smallint DEFAULT 0 NOT NULL,
	"losing_streak" smallint DEFAULT 0 NOT NULL,
	"help_used" smallint DEFAULT 0 NOT NULL,
	"stars" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"badges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(12) NOT NULL,
	"creator_id" uuid,
	"creator_name" varchar(40) NOT NULL,
	"creator_color" varchar(6) DEFAULT 'random' NOT NULL,
	"initial_time" integer DEFAULT 600 NOT NULL,
	"increment" integer DEFAULT 5 NOT NULL,
	"rated" boolean DEFAULT false NOT NULL,
	"kind" varchar(10) DEFAULT 'open' NOT NULL,
	"target_id" uuid,
	"game_id" uuid,
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_progress" (
	"user_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"quests" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"xp" smallint DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_progress_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"epd" text NOT NULL,
	"depth" smallint NOT NULL,
	"cp" integer,
	"mate" smallint,
	"pv" text NOT NULL,
	"lines" jsonb,
	"nodes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluations_epd_depth_pk" PRIMARY KEY("epd","depth")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "game_analyses" (
	"game_id" uuid PRIMARY KEY NOT NULL,
	"depth" smallint NOT NULL,
	"report" jsonb NOT NULL,
	"accuracy_white" real,
	"accuracy_black" real,
	"acpl_white" integer,
	"acpl_black" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(12) NOT NULL,
	"mode" varchar(16) NOT NULL,
	"speed" varchar(20) DEFAULT 'rapid' NOT NULL,
	"rated" boolean DEFAULT false NOT NULL,
	"white_id" uuid,
	"black_id" uuid,
	"white_name" varchar(40) NOT NULL,
	"black_name" varchar(40) NOT NULL,
	"white_rating" integer,
	"black_rating" integer,
	"white_rating_delta" integer,
	"black_rating_delta" integer,
	"bot_level" smallint,
	"initial_time" integer DEFAULT 0 NOT NULL,
	"increment" integer DEFAULT 0 NOT NULL,
	"start_fen" text,
	"moves" text DEFAULT '' NOT NULL,
	"pgn" text,
	"clock_history" jsonb,
	"status" varchar(24) DEFAULT 'playing' NOT NULL,
	"result" varchar(8) DEFAULT '*' NOT NULL,
	"winner" varchar(1),
	"eco" varchar(3),
	"opening" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" varchar(64) NOT NULL,
	"steps_completed" smallint DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "openings" (
	"epd" text PRIMARY KEY NOT NULL,
	"eco" varchar(3) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_fr" varchar(200) NOT NULL,
	"pgn" text NOT NULL,
	"uci" text NOT NULL,
	"ply" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_evals" (
	"epd" text PRIMARY KEY NOT NULL,
	"cp" integer,
	"mate" smallint,
	"depth" smallint NOT NULL,
	"best" text,
	"line" text,
	"alt_lines" jsonb
);
--> statement-breakpoint
CREATE TABLE "puzzle_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"puzzle_id" varchar(12) NOT NULL,
	"solved" boolean NOT NULL,
	"correct_moves" smallint DEFAULT 0 NOT NULL,
	"time_ms" integer,
	"rating_after" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzles" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"fen" text NOT NULL,
	"moves" text NOT NULL,
	"rating" integer NOT NULL,
	"rating_deviation" integer DEFAULT 75 NOT NULL,
	"popularity" smallint DEFAULT 0 NOT NULL,
	"plays" integer DEFAULT 0 NOT NULL,
	"themes" text[] DEFAULT '{}'::text[] NOT NULL,
	"opening_tags" text[],
	"game_url" text
);
--> statement-breakpoint
CREATE TABLE "rating_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" varchar(20) NOT NULL,
	"rating" integer NOT NULL,
	"deviation" integer NOT NULL,
	"delta" integer NOT NULL,
	"game_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"user_id" uuid NOT NULL,
	"category" varchar(20) NOT NULL,
	"rating" integer DEFAULT 1500 NOT NULL,
	"deviation" integer DEFAULT 350 NOT NULL,
	"volatility" real DEFAULT 0.09 NOT NULL,
	"elo" integer DEFAULT 1500 NOT NULL,
	"games" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"peak" integer DEFAULT 1500 NOT NULL,
	"peak_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_user_id_category_pk" PRIMARY KEY("user_id","category")
);
--> statement-breakpoint
CREATE TABLE "saved_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"game_id" uuid,
	"source" varchar(16) DEFAULT 'pgn' NOT NULL,
	"white_name" varchar(60),
	"black_name" varchar(60),
	"result" varchar(8) DEFAULT '*' NOT NULL,
	"played_at" varchar(24),
	"eco" varchar(3),
	"opening" varchar(120),
	"lecteur" varchar(1),
	"depth" smallint NOT NULL,
	"start_fen" text,
	"moves" text NOT NULL,
	"positions" jsonb NOT NULL,
	"accuracy_white" real,
	"accuracy_black" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_agent" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(12) NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" varchar(500),
	"visibility" varchar(10) DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"start_fen" text,
	"moves" text DEFAULT '' NOT NULL,
	"comments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_pairings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"white_id" uuid NOT NULL,
	"black_id" uuid NOT NULL,
	"game_slug" varchar(12) NOT NULL,
	"result" varchar(8) DEFAULT '*' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_players" (
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"username" varchar(40) NOT NULL,
	"rating" integer DEFAULT 1500 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"games" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"playing" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_players_tournament_id_user_id_pk" PRIMARY KEY("tournament_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(12) NOT NULL,
	"name" varchar(80) NOT NULL,
	"owner_id" uuid,
	"initial_time" integer DEFAULT 180 NOT NULL,
	"increment" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 45 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"status" varchar(12) DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(20) NOT NULL,
	"username_lower" varchar(20) NOT NULL,
	"email" varchar(254),
	"email_verified_at" timestamp with time zone,
	"email_token_hash" varchar(64),
	"email_token_expires_at" timestamp with time zone,
	"reset_token_hash" varchar(64),
	"reset_token_expires_at" timestamp with time zone,
	"password_hash" text NOT NULL,
	"avatar" varchar(200) DEFAULT '♟️',
	"bio" varchar(280),
	"country_code" varchar(2),
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"role" varchar(16) DEFAULT 'player' NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_games" ADD CONSTRAINT "active_games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_progress" ADD CONSTRAINT "bot_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_progress" ADD CONSTRAINT "career_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_progress" ADD CONSTRAINT "daily_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_analyses" ADD CONSTRAINT "game_analyses_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_white_id_users_id_fk" FOREIGN KEY ("white_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_black_id_users_id_fk" FOREIGN KEY ("black_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_analyses" ADD CONSTRAINT "saved_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_analyses" ADD CONSTRAINT "saved_analyses_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studies" ADD CONSTRAINT "studies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_chapters" ADD CONSTRAINT "study_chapters_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_pairings" ADD CONSTRAINT "tournament_pairings_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_slug_idx" ON "challenges" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "challenges_status_idx" ON "challenges" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "daily_progress_user_idx" ON "daily_progress" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "evaluations_created_idx" ON "evaluations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_idx" ON "friendships" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id","status");--> statement-breakpoint
CREATE INDEX "friendships_requester_idx" ON "friendships" USING btree ("requester_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "games_slug_idx" ON "games" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "games_white_idx" ON "games" USING btree ("white_id","created_at");--> statement-breakpoint
CREATE INDEX "games_black_idx" ON "games" USING btree ("black_id","created_at");--> statement-breakpoint
CREATE INDEX "games_eco_idx" ON "games" USING btree ("eco");--> statement-breakpoint
CREATE INDEX "games_created_idx" ON "games" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "openings_eco_idx" ON "openings" USING btree ("eco");--> statement-breakpoint
CREATE INDEX "openings_ply_idx" ON "openings" USING btree ("ply");--> statement-breakpoint
CREATE INDEX "position_evals_depth_idx" ON "position_evals" USING btree ("depth");--> statement-breakpoint
CREATE INDEX "puzzle_attempts_user_idx" ON "puzzle_attempts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "puzzle_attempts_unique_idx" ON "puzzle_attempts" USING btree ("user_id","puzzle_id");--> statement-breakpoint
CREATE INDEX "puzzles_rating_idx" ON "puzzles" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "puzzles_themes_idx" ON "puzzles" USING gin ("themes");--> statement-breakpoint
CREATE INDEX "puzzles_popularity_idx" ON "puzzles" USING btree ("popularity");--> statement-breakpoint
CREATE INDEX "rating_history_user_idx" ON "rating_history" USING btree ("user_id","category","created_at");--> statement-breakpoint
CREATE INDEX "ratings_leaderboard_idx" ON "ratings" USING btree ("category","rating");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_analyses_owner_idx" ON "saved_analyses" USING btree ("user_id","fingerprint");--> statement-breakpoint
CREATE INDEX "saved_analyses_recent_idx" ON "saved_analyses" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "studies_slug_idx" ON "studies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "studies_owner_idx" ON "studies" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "study_chapters_study_idx" ON "study_chapters" USING btree ("study_id","position");--> statement-breakpoint
CREATE INDEX "tournament_pairings_idx" ON "tournament_pairings" USING btree ("tournament_id","result");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_pairings_slug_idx" ON "tournament_pairings" USING btree ("game_slug");--> statement-breakpoint
CREATE INDEX "tournament_players_rank_idx" ON "tournament_players" USING btree ("tournament_id","score");--> statement-breakpoint
CREATE UNIQUE INDEX "tournaments_slug_idx" ON "tournaments" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tournaments_status_idx" ON "tournaments" USING btree ("status","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_idx" ON "users" USING btree ("username_lower");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email") WHERE "users"."email" is not null;--> statement-breakpoint
CREATE INDEX "users_last_seen_idx" ON "users" USING btree ("last_seen_at");