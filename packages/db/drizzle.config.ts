import { defineConfig } from 'drizzle-kit'

/**
 * Configuration des migrations.
 *
 * On utilise le style « snake_case » : les colonnes sont nommées
 * `created_at` en base et `createdAt` en TypeScript, sans avoir à écrire la
 * correspondance à la main pour chaque champ.
 */
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://gambit:gambit@localhost:5432/gambit',
  },
  verbose: true,
  strict: true,
})
