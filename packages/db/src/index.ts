/**
 * Accès à la base de données.
 *
 * Une seule connexion partagée par processus. En développement, Next.js
 * recharge les modules à chaque modification : sans précaution on ouvrirait une
 * nouvelle grappe de connexions toutes les dix secondes jusqu'à saturer
 * PostgreSQL. On la range donc sur `globalThis`.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

export * from './schema.ts'
export { schema }
export {
  and,
  arrayContains,
  arrayOverlaps,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm'

export type Database = ReturnType<typeof createDatabase>

function createDatabase(connectionString: string) {
  const client = postgres(connectionString, {
    // Assez de connexions pour servir plusieurs parties en parallèle, assez peu
    // pour ne pas épuiser un PostgreSQL de conteneur (100 par défaut).
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 30,
    connect_timeout: 15,
    // Les dates reviennent en objets `Date`, pas en chaînes.
    types: {},
    onnotice: () => {},
  })

  return drizzle(client, { schema, casing: 'snake_case' })
}

declare global {
   
  var __coupParfaitDb: Database | undefined
}

/**
 * Instance partagée.
 *
 * Lance une erreur explicite si `DATABASE_URL` manque : mieux vaut un message
 * clair au démarrage qu'un « connection refused » cinquante lignes plus loin.
 */
export function getDb(): Database {
  if (globalThis.__coupParfaitDb) return globalThis.__coupParfaitDb

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL est absente. Copie .env.example en .env et renseigne la connexion PostgreSQL.',
    )
  }

  const database = createDatabase(url)
  globalThis.__coupParfaitDb = database
  return database
}

/**
 * Vrai si la base est joignable.
 *
 * Utilisé par la sonde de santé du conteneur et par les pages qui doivent se
 * dégrader proprement quand la base est absente — l'application reste jouable
 * hors ligne, seules les fonctions de compte disparaissent.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    const database = getDb()
    await database.execute(sqlRaw`select 1`)
    return true
  } catch {
    return false
  }
}

import { sql as sqlRaw } from 'drizzle-orm'
