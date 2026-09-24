CREATE TABLE "mistake_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_id" uuid NOT NULL,
	"ply" smallint NOT NULL,
	"fen" text NOT NULL,
	"played_san" varchar(12) NOT NULL,
	"played_uci" varchar(5) NOT NULL,
	"best_san" varchar(12) NOT NULL,
	"best_uci" varchar(5) NOT NULL,
	"accepted" jsonb NOT NULL,
	"quality" varchar(12) NOT NULL,
	"explanation" jsonb,
	"box" smallint DEFAULT 1 NOT NULL,
	"due_on" varchar(10) NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"successes" integer DEFAULT 0 NOT NULL,
	"last_reviewed_on" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_analyses" ADD COLUMN "revisions_extraites" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mistake_reviews" ADD CONSTRAINT "mistake_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_reviews" ADD CONSTRAINT "mistake_reviews_analysis_id_saved_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."saved_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mistake_reviews_position_idx" ON "mistake_reviews" USING btree ("user_id","fen","played_uci");--> statement-breakpoint
CREATE INDEX "mistake_reviews_due_idx" ON "mistake_reviews" USING btree ("user_id","due_on");