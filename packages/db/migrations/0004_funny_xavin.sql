CREATE TABLE "live_games" (
	"slug" varchar(16) PRIMARY KEY NOT NULL,
	"salon" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
