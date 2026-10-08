-- La connexion avec Google : l'identifiant OpenID (`sub`) du compte Google lié.
-- Purement additive : la colonne est vide pour tous les comptes existants, et la
-- version en service pendant la bascule l'ignore.
ALTER TABLE "users" ADD COLUMN "google_sub" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_sub_idx" ON "users" USING btree ("google_sub") WHERE "users"."google_sub" is not null;
