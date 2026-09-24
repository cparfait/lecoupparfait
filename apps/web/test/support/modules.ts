/**
 * `mock.module`, sous toutes les versions de Node que le dépôt accepte.
 *
 * L'option qui déclare les exports d'un module simulé a changé de nom :
 * `namedExports` jusqu'à Node 22, `exports` ensuite — l'ancienne marche
 * encore mais avertit à chaque fichier. La CI tourne sous Node 22, les postes
 * sous Node 24 : on sonde donc une fois laquelle la version courante comprend,
 * plutôt que de deviner d'après le numéro de version.
 */

import { mock } from 'node:test'

const SONDE = 'data:text/javascript,export const sonde = 0'

async function comprendExports(): Promise<boolean> {
  const essai = mock.module(SONDE, { exports: { sonde: 1 } } as never)
  try {
    const simule = (await import(SONDE)) as { sonde: number }
    return simule.sonde === 1
  } catch {
    return false
  } finally {
    essai.restore()
  }
}

const avecExports = await comprendExports()

/** Remplace le module `specifier` par un module qui exporte `exports`. */
export function simulerModule(specifier: string, exports: Record<string, unknown>): void {
  mock.module(specifier, (avecExports ? { exports } : { namedExports: exports }) as never)
}
