#!/usr/bin/env node
/**
 * Applique les migrations à la base.
 *
 * **Pourquoi ce script existe alors que `npm run db:migrate` fait la même
 * chose.** Il ne la fait pas là où il faut. `db:migrate` passe par
 * `drizzle-kit`, qui est une dépendance de *développement* : l'image de
 * production embarque la sortie « standalone » de Next, c'est-à-dire les seuls
 * modules réellement utilisés par l'application. `drizzle-kit` n'en fait pas
 * partie, et la commande échouerait dans le conteneur.
 *
 * Ce script n'utilise que `drizzle-orm` et `postgres`, tous deux présents à
 * l'exécution puisque les routes de l'application s'en servent. Il lit les
 * mêmes fichiers SQL, tient le même journal `__drizzle_migrations`, et se
 * relance sans risque : une migration déjà appliquée est ignorée.
 *
 * Usage :
 *   node scripts/migrate.mjs
 *   docker compose exec web node scripts/migrate.mjs
 */

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// Node ne lit pas `.env` de lui-même, et ce script tourne seul. En production
// les variables viennent de l'environnement Docker, et l'absence de fichier
// n'est donc pas une erreur.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // Rien à charger : la connexion viendra de l'environnement.
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL est absente.')
  process.exit(1)
}

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dossier = join(racine, 'packages', 'db', 'migrations')

if (!existsSync(dossier)) {
  console.error(`✗ Aucun dossier de migrations : ${dossier}`)
  console.error('  Fabrique-le avec `npm run db:generate`.')
  process.exit(1)
}

// Une seule connexion, et `max: 1` : les migrations sont séquentielles par
// nature, et une grappe de connexions ne ferait qu'augmenter les chances qu'un
// verrou soit pris par une autre.
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} })

console.log('▸ Migrations')
console.log(`  dossier   ${dossier}`)

try {
  const debut = Date.now()
  await migrate(drizzle(sql), { migrationsFolder: dossier })
  console.log(`\n✓ Base à jour en ${((Date.now() - debut) / 1000).toFixed(1)} s\n`)
} catch (error) {
  console.error('\n✗ Migration impossible :', error instanceof Error ? error.message : error)
  console.error('')
  console.error('  Si la base est déjà en service et que les tables existent,')
  console.error('  la migration initiale échouera : elle les crée sans')
  console.error('  « IF NOT EXISTS ». Il faut alors la marquer comme appliquée')
  console.error('  plutôt que de la rejouer.')
  process.exitCode = 1
} finally {
  await sql.end()
}
