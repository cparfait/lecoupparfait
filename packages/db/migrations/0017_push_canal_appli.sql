-- L'appli Android s'abonne aux notifications par Firebase, et non par le push
-- du navigateur : sa WebView n'en a pas. `canal` distingue les deux, et vaut
-- `web` pour toutes les lignes existantes. Purement additive : la version en
-- service pendant la bascule ignore la colonne.
ALTER TABLE "push_subscriptions" ADD COLUMN "canal" varchar(8) DEFAULT 'web' NOT NULL;
