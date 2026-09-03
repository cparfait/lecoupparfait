ALTER TABLE "saved_analyses" ADD COLUMN "partage" varchar(12);--> statement-breakpoint
CREATE UNIQUE INDEX "saved_analyses_partage_idx" ON "saved_analyses" USING btree ("partage");