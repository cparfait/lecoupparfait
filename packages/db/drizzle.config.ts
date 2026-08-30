import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'drizzle-kit'

/**
 * Configuration des migrations.
 *
 * On utilise le style « snake_case » : les colonnes sont nommées
 * `created_at` en base et `createdAt` en TypeScript, sans avoir à écrire la
 * correspondance à la main pour chaque champ.
 */

/**
 * Le `.env` vit à la racine du dépôt, pas ici.
 *
 * `npm run db:push` lancé depuis la racine délègue au paquet `db`, si bien que
 * drizzle-kit s'exécute avec `packages/db` pour répertoire courant — et c'est
 * là qu'il cherche le `.env`, sans le trouver. Il retombait alors sur les
 * identifiants de repli, et échouait sur un « Pulling schema from database… »
 * suivi de rien : pas de message, pas de cause, juste un code de sortie.
 *
 * On remonte donc depuis le répertoire courant jusqu'à trouver un `.env`.
 * Remonter, plutôt que viser `../../.env` en dur : drizzle-kit reconstruit ce
 * fichier avant de l'exécuter, si bien qu'`import.meta.dirname` y vaut
 * `undefined` — un chemin calculé à partir du fichier échoue donc.
 *
 * `loadEnvFile` ne remplace pas les variables déjà définies : une valeur
 * passée dans l'environnement continue de l'emporter, ce qu'on veut pour
 * viser une base de test sans toucher au fichier.
 */
for (let dossier = process.cwd(), i = 0; i < 4; i++) {
  const candidat = join(dossier, '.env')
  if (existsSync(candidat)) {
    process.loadEnvFile(candidat)
    break
  }
  const parent = join(dossier, '..')
  if (parent === dossier) break
  dossier = parent
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    // Le repli reprend les valeurs qu'écrit `scripts/setup.mjs` : s'il sert,
    // c'est qu'il n'y a pas de `.env`, et autant viser la bonne base.
    url: process.env.DATABASE_URL ?? 'postgresql://coupparfait@localhost:5432/coupparfait',
  },
  verbose: true,
  strict: true,
})
