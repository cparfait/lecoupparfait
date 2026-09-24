/**
 * Une fausse base, branchée là où `getDb()` va la chercher.
 *
 * `packages/db/src/index.ts` range déjà l'instance sur
 * `globalThis.__coupParfaitDb` (pour survivre au rechargement à chaud de Next)
 * et la rend telle quelle quand elle existe. C'est la seule couture dont les
 * tests ont besoin : on y dépose un objet qui imite le constructeur de requêtes
 * de Drizzle, et aucune ligne de l'application ne change.
 *
 * L'imitation est volontairement bête. Elle ne comprend pas les conditions
 * `where` — les reproduire serait réécrire Postgres, et tester la copie — :
 * elle **note** chaque opération (type, table, valeurs écrites) et rend ce que
 * le test a décidé qu'elle rendrait, table par table. Les tests portent donc
 * sur ce que la route décide d'écrire, pas sur le SQL qui en sortirait.
 */

import { getTableName, type Table } from 'drizzle-orm'
import type { Database } from '@coupparfait/db'

export interface Operation {
  type: 'select' | 'insert' | 'update' | 'delete'
  table: string | null
  /** Ce que reçoit `.values(...)` d'une insertion. */
  values?: unknown
  /** Ce que reçoit `.set(...)` d'une mise à jour. */
  set?: unknown
}

export type Repondeur = (operation: Operation) => unknown[] | Promise<unknown[]>

export interface FausseBase {
  operations: Operation[]
  /** Les opérations d'un type sur une table, dans l'ordre. */
  sur(type: Operation['type'], table: string): Operation[]
}

/**
 * Installe une fausse base et la rend. `repondre` décide des lignes renvoyées
 * par chaque opération ; par défaut, aucune.
 */
export function installerFausseBase(repondre: Repondeur = () => []): FausseBase {
  const operations: Operation[] = []

  // Toute la chaîne (`from`, `where`, `limit`, `returning`…) rend le même
  // objet, et l'`await` final déclenche la réponse : c'est la forme des
  // requêtes Drizzle, qui sont des promesses paresseuses.
  function chaine(operation: Operation): unknown {
    operations.push(operation)
    let resultat: Promise<unknown[]> | undefined
    const executer = () => (resultat ??= Promise.resolve().then(() => repondre(operation)))
    const requete: unknown = new Proxy(
      {},
      {
        get(_cible, nom) {
          if (nom === 'then') {
            return (ok: (v: unknown[]) => unknown, ko: (e: unknown) => unknown) =>
              executer().then(ok, ko)
          }
          if (nom === 'from') {
            return (table: Table) => {
              operation.table = getTableName(table)
              return requete
            }
          }
          if (nom === 'values') {
            return (valeurs: unknown) => {
              operation.values = valeurs
              return requete
            }
          }
          if (nom === 'set') {
            return (valeurs: unknown) => {
              operation.set = valeurs
              return requete
            }
          }
          return () => requete
        },
      },
    )
    return requete
  }

  const base = {
    select: () => chaine({ type: 'select', table: null }),
    insert: (table: Table) => chaine({ type: 'insert', table: getTableName(table) }),
    update: (table: Table) => chaine({ type: 'update', table: getTableName(table) }),
    delete: (table: Table) => chaine({ type: 'delete', table: getTableName(table) }),
  }
  globalThis.__coupParfaitDb = base as unknown as Database

  return {
    operations,
    sur: (type, table) => operations.filter((op) => op.type === type && op.table === table),
  }
}
