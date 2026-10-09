-- Les signalements du tchat : le seul endroit où un message de partie s'écrit.
-- Purement additive : une table neuve, que la version en service ignore.
CREATE TABLE "signalements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"partie" varchar(12) NOT NULL,
	"texte" varchar(300) NOT NULL,
	"auteur_nom" varchar(40) NOT NULL,
	"auteur_id" uuid,
	"auteur_navigateur" varchar(40),
	"par_id" uuid,
	"par_navigateur" varchar(40),
	"traite_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_auteur_id_users_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_par_id_users_id_fk" FOREIGN KEY ("par_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "signalements_recus_idx" ON "signalements" USING btree ("created_at");